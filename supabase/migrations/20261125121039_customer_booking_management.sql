-- Service-only operations. Public callers must pass through the Worker, which
-- validates the origin, rate-limits by trusted network address and checks inputs.
create table public.booking_management_limits (
  key text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
alter table public.booking_management_limits enable row level security;
revoke all on public.booking_management_limits from public, anon, authenticated;
grant all on public.booking_management_limits to service_role;

create function public.consume_booking_management_attempt(p_key text,p_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare used integer;
begin
  if p_key !~ '^[a-f0-9]{64}$' or p_limit not in (12,120) then return false; end if;
  delete from public.booking_management_limits where expires_at<now()-interval '1 day';
  insert into public.booking_management_limits(key,attempts,expires_at)
  values(p_key,1,now()+interval '15 minutes')
  on conflict(key) do update set
    attempts=case when booking_management_limits.expires_at<=now() then 1 else least(booking_management_limits.attempts+1,1000) end,
    expires_at=case when booking_management_limits.expires_at<=now() then now()+interval '15 minutes' else booking_management_limits.expires_at end
  returning attempts into used;
  return used<=p_limit;
end $$;
revoke all on function public.consume_booking_management_attempt(text,integer) from public,anon,authenticated;
grant execute on function public.consume_booking_management_attempt(text,integer) to service_role;

create function public.manage_customer_booking(
  p_reference text,p_phone text,p_action text default 'lookup',
  p_date date default null,p_starts_at timestamp without time zone default null,
  p_service_ids text[] default null,p_version text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  booking public.booking_requests%rowtype;
  person public.clients%rowtype;
  appt public.appointments%rowtype;
  first_start timestamp; last_end timestamp; version text; active_count integer;
  total_count integer; minutes integer; names text; service_count integer;
  can_change boolean; result jsonb; slots jsonb; now_local timestamp:=timezone('Atlantic/Canary',now());
begin
  if p_action not in ('lookup','slots','cancel','reschedule') then return jsonb_build_object('error','invalid'); end if;
  -- A short legacy reference is never sufficient by itself. Compare the complete
  -- normalized phone, including its country prefix when one was supplied.
  select b.* into booking from public.booking_requests b join public.clients c on c.id=b.client_id
    where b.reference=upper(trim(p_reference))
    and regexp_replace(c.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g')
    and length(regexp_replace(p_phone,'\D','','g')) between 9 and 15
    for update of b;
  if not found then return jsonb_build_object('error','not_found'); end if;
  select * into person from public.clients where id=booking.client_id;
  perform 1 from public.appointments where booking_request_id=booking.id order by id for update;
  select min(starts_at),max(ends_at),count(*) filter(where status in ('confirmed','pending')),count(*),
    md5(string_agg(id::text||updated_at::text,',' order by id))
  into first_start,last_end,active_count,total_count,version
  from public.appointments where booking_request_id=booking.id;
  if total_count=0 then return jsonb_build_object('error','not_found'); end if;
  can_change:=active_count=total_count and first_start>=now_local+interval '6 hours';
  if p_action in ('cancel','reschedule') then
    if p_action='cancel' and active_count=0 and not exists(select 1 from public.appointments where booking_request_id=booking.id and status<>'cancelled') then
      return public.manage_customer_booking(p_reference,p_phone,'lookup');
    end if;
    if p_version is distinct from version then return jsonb_build_object('error','changed'); end if;
    if not can_change then return jsonb_build_object('error','cutoff'); end if;
  end if;
  if p_action='cancel' then
    update public.appointments set status='cancelled',status_reason='Cancelada por la clienta desde la web.' where booking_request_id=booking.id;
    update public.booking_requests set waitlist=false where id=booking.id;
    return public.manage_customer_booking(p_reference,p_phone,'lookup');
  end if;
  if p_action in ('slots','reschedule') then
    if not can_change then return jsonb_build_object('error','cutoff'); end if;
    if total_count<>1 then return jsonb_build_object('error','contact'); end if;
    select * into appt from public.appointments where booking_request_id=booking.id;
    if appt.professional_key<>'nurme' or person.is_blocked then return jsonb_build_object('error','contact'); end if;
    minutes:=extract(epoch from (appt.ends_at-appt.starts_at))::integer/60;
    names:=appt.service_name;
    if p_service_ids is not null then
      if cardinality(p_service_ids) not between 1 and 12 then return jsonb_build_object('error','services'); end if;
      select count(*),sum(s.duration_minutes),string_agg(s.name,', ' order by requested.position)
      into service_count,minutes,names from unnest(p_service_ids) with ordinality requested(id,position)
      join public.services s on s.id=requested.id and s.is_active and s.professional_key='nurme';
      if service_count<>cardinality(p_service_ids) or service_count<>(select count(distinct x) from unnest(p_service_ids) x) then return jsonb_build_object('error','services'); end if;
    end if;
    if minutes is null or minutes<1 or minutes>600 then return jsonb_build_object('error','services'); end if;
    if p_action='slots' then
      if p_date is null or p_date<now_local::date or p_date>now_local::date+730 then return jsonb_build_object('error','invalid'); end if;
      select coalesce(jsonb_agg(jsonb_build_object('startsAt',to_char(slot,'YYYY-MM-DD"T"HH24:MI:SS'),'time',to_char(slot,'HH24:MI'),'endsAt',to_char(slot+make_interval(mins=>minutes),'YYYY-MM-DD"T"HH24:MI:SS')) order by slot),'[]'::jsonb)
      into slots from generate_series(p_date+time '09:00',p_date+time '19:00'-make_interval(mins=>minutes),interval '15 minutes') slot
      where extract(isodow from p_date) between 1 and 5 and slot>=now_local+interval '6 hours'
      and not exists(select 1 from public.appointments a where a.professional_key='nurme' and a.booking_request_id is distinct from booking.id and a.status in ('pending','confirmed') and a.starts_at<slot+make_interval(mins=>minutes) and a.ends_at>slot)
      and not exists(select 1 from public.schedule_blocks b where (b.professional_key is null or b.professional_key='nurme') and b.starts_at<slot+make_interval(mins=>minutes) and b.ends_at>slot);
      return jsonb_build_object('slots',slots,'durationMinutes',minutes);
    end if;
    if p_starts_at is null or p_starts_at<now_local+interval '6 hours' or p_starts_at::date>now_local::date+730
      or extract(isodow from p_starts_at) not between 1 and 5 or extract(second from p_starts_at)<>0 or extract(minute from p_starts_at)::integer%15<>0
      or p_starts_at::time<time '09:00' or (p_starts_at+make_interval(mins=>minutes))::date<>p_starts_at::date or (p_starts_at+make_interval(mins=>minutes))::time>time '19:00'
      then return jsonb_build_object('error','hours'); end if;
    -- Serialize with block writes; appointment collisions also have the existing
    -- GiST exclusion constraint as a final, transaction-safe guard.
    lock table public.schedule_blocks in share mode;
    if exists(select 1 from public.schedule_blocks b where (b.professional_key is null or b.professional_key='nurme') and b.starts_at<p_starts_at+make_interval(mins=>minutes) and b.ends_at>p_starts_at)
      or exists(select 1 from public.appointments a where a.id<>appt.id and a.professional_key='nurme' and a.status in ('pending','confirmed') and a.starts_at<p_starts_at+make_interval(mins=>minutes) and a.ends_at>p_starts_at)
      then return jsonb_build_object('error','occupied'); end if;
    update public.appointments set starts_at=p_starts_at,ends_at=p_starts_at+make_interval(mins=>minutes),service_name=names where id=appt.id;
    if p_service_ids is not null then update public.booking_requests set service_ids=p_service_ids,service_summary=names where id=booking.id; end if;
    return public.manage_customer_booking(p_reference,p_phone,'lookup');
  end if;
  select jsonb_build_object('reference',booking.reference,'name',person.name,'version',version,'canCancel',can_change,'canModify',can_change and total_count=1 and not person.is_blocked and not exists(select 1 from public.appointments where booking_request_id=booking.id and professional_key<>'nurme'),
    'appointments',jsonb_agg(jsonb_build_object('service',service_name,'startsAt',to_char(starts_at,'YYYY-MM-DD"T"HH24:MI:SS'),'endsAt',to_char(ends_at,'YYYY-MM-DD"T"HH24:MI:SS'),'status',status) order by starts_at))
    into result from public.appointments where booking_request_id=booking.id;
  return result;
exception when exclusion_violation then return jsonb_build_object('error','occupied');
end $$;
revoke all on function public.manage_customer_booking(text,text,text,date,timestamp without time zone,text[],text) from public,anon,authenticated;
grant execute on function public.manage_customer_booking(text,text,text,date,timestamp without time zone,text[],text) to service_role;
