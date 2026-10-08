-- MB Beauty · reservas públicas seguras y horario local de Tenerife
-- Ejecutar una sola vez después de 202608290001_initial_schema.sql.

alter table public.booking_requests
  add column if not exists hold_expires_at timestamptz;

alter table public.appointments
  add column if not exists hold_expires_at timestamptz;

alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  alter column starts_at type timestamp without time zone using starts_at at time zone 'UTC',
  alter column ends_at type timestamp without time zone using ends_at at time zone 'UTC';

alter table public.schedule_blocks
  alter column starts_at type timestamp without time zone using starts_at at time zone 'UTC',
  alter column ends_at type timestamp without time zone using ends_at at time zone 'UTC';

alter table public.appointments
  add constraint appointments_no_overlap exclude using gist (
    professional_key with =,
    tsrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'));

create or replace function public.booking_busy_intervals(
  p_date date,
  p_professional_keys text[]
)
returns table (
  professional_key text,
  starts_at timestamp without time zone,
  ends_at timestamp without time zone
)
language sql
stable
security definer
set search_path = public
as $$
  select a.professional_key, a.starts_at, a.ends_at
  from public.appointments a
  where a.professional_key = any(p_professional_keys)
    and a.status in ('pending', 'confirmed')
    and a.starts_at < p_date + interval '1 day'
    and a.ends_at > p_date
  union all
  select requested.professional_key, block.starts_at, block.ends_at
  from public.schedule_blocks block
  cross join unnest(p_professional_keys) as requested(professional_key)
  where (block.professional_key is null or block.professional_key = requested.professional_key)
    and block.starts_at < p_date + interval '1 day'
    and block.ends_at > p_date;
$$;

create or replace function public.create_public_booking(
  p_request_id uuid,
  p_service_ids text[],
  p_preferred_professional text,
  p_starts_at timestamp without time zone,
  p_name text,
  p_phone text,
  p_notes text default '',
  p_waitlist boolean default false,
  p_privacy_version text default '2026-08-28'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reference text;
  v_client_id uuid;
  v_existing_name text;
  v_is_blocked boolean;
  v_primary_professional text;
  v_required_professionals integer;
  v_service_count integer;
  v_total_minutes integer;
  v_ends_at timestamp without time zone;
  v_close_time time;
  v_cursor timestamp without time zone;
  v_segment_start timestamp without time zone;
  v_segment_professional text;
  v_segment_names text;
  v_service record;
  v_appointment_count integer := 0;
begin
  select br.reference
  into v_reference
  from public.booking_requests br
  where br.id = p_request_id;

  if found then
    return jsonb_build_object(
      'ok', true,
      'reference', v_reference,
      'alreadySaved', true
    );
  end if;

  if cardinality(p_service_ids) < 1 or cardinality(p_service_ids) > 12 then
    raise exception 'invalid_services';
  end if;
  if p_preferred_professional not in ('any', 'sarai', 'yeroha', 'nurme') then
    raise exception 'invalid_professional';
  end if;
  if char_length(trim(p_name)) < 2 or char_length(regexp_replace(p_phone, '\D', '', 'g')) < 9 then
    raise exception 'invalid_client';
  end if;
  if p_starts_at <= timezone('Atlantic/Canary', now()) then
    raise exception 'invalid_time';
  end if;

  select count(*), coalesce(sum(s.duration_minutes), 0),
    count(distinct s.professional_key), min(s.professional_key)
  into v_service_count, v_total_minutes, v_required_professionals, v_primary_professional
  from public.services s
  where s.id = any(p_service_ids) and s.is_active = true;

  if v_service_count <> cardinality(p_service_ids) then
    raise exception 'invalid_services';
  end if;
  if p_preferred_professional <> 'any'
    and (v_required_professionals <> 1 or v_primary_professional <> p_preferred_professional) then
    raise exception 'invalid_professional';
  end if;

  select s.professional_key
  into v_primary_professional
  from unnest(p_service_ids) with ordinality requested(id, position)
  join public.services s on s.id = requested.id
  order by requested.position
  limit 1;

  v_ends_at := p_starts_at + make_interval(mins => v_total_minutes);
  v_close_time := case extract(dow from p_starts_at)
    when 0 then null
    when 6 then time '13:30'
    else time '18:00'
  end;
  if v_close_time is null
    or p_starts_at::time < time '09:30'
    or v_ends_at::date <> p_starts_at::date
    or v_ends_at::time > v_close_time then
    raise exception 'outside_opening_hours';
  end if;

  select c.id, c.name, c.is_blocked
  into v_client_id, v_existing_name, v_is_blocked
  from public.clients c
  where c.phone = trim(p_phone)
    and lower(trim(c.name)) = lower(trim(p_name))
  order by c.created_at
  limit 1;

  if v_is_blocked then
    raise exception 'client_blocked';
  end if;
  if v_client_id is null then
    insert into public.clients (
      name, phone, notes, primary_professional_key, is_test
    ) values (
      trim(p_name), trim(p_phone), left(trim(p_notes), 400),
      v_primary_professional, false
    ) returning id into v_client_id;
  end if;

  v_reference := 'KZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.booking_requests (
    id, client_id, reference, preferred_professional, service_ids,
    service_summary, waitlist, hold_expires_at, privacy_accepted_at, privacy_version
  )
  select
    p_request_id,
    v_client_id,
    v_reference,
    p_preferred_professional,
    p_service_ids,
    string_agg(s.name, ', ' order by requested.position),
    p_waitlist,
    now() + interval '1 hour',
    now(),
    p_privacy_version
  from unnest(p_service_ids) with ordinality requested(id, position)
  join public.services s on s.id = requested.id;

  insert into public.client_professionals (client_id, professional_key)
  select distinct v_client_id, s.professional_key
  from public.services s
  where s.id = any(p_service_ids)
  on conflict do nothing;

  v_cursor := p_starts_at;
  for v_service in
    select s.name, s.duration_minutes, s.professional_key
    from unnest(p_service_ids) with ordinality requested(id, position)
    join public.services s on s.id = requested.id
    order by requested.position
  loop
    if v_segment_professional is null then
      v_segment_professional := v_service.professional_key;
      v_segment_start := v_cursor;
      v_segment_names := v_service.name;
    elsif v_segment_professional = v_service.professional_key then
      v_segment_names := v_segment_names || ', ' || v_service.name;
    else
      if exists (
        select 1 from public.schedule_blocks block
        where (block.professional_key is null or block.professional_key = v_segment_professional)
          and block.starts_at < v_cursor
          and block.ends_at > v_segment_start
      ) then
        raise exception 'slot_unavailable' using errcode = '23P01';
      end if;
      insert into public.appointments (
        client_id, booking_request_id, professional_key, service_name,
        starts_at, ends_at, status, notes
      ) values (
        v_client_id, p_request_id, v_segment_professional, v_segment_names,
        v_segment_start, v_cursor, 'confirmed',
        left('Reserva web confirmada automáticamente ' || v_reference ||
          case when p_waitlist then ' · Acepta lista de espera' else '' end ||
          case when trim(p_notes) <> '' then ' · Clienta: ' || trim(p_notes) else '' end, 600)
      );
      v_appointment_count := v_appointment_count + 1;
      v_segment_professional := v_service.professional_key;
      v_segment_start := v_cursor;
      v_segment_names := v_service.name;
    end if;
    v_cursor := v_cursor + make_interval(mins => v_service.duration_minutes);
  end loop;

  if exists (
    select 1 from public.schedule_blocks block
    where (block.professional_key is null or block.professional_key = v_segment_professional)
      and block.starts_at < v_cursor
      and block.ends_at > v_segment_start
  ) then
    raise exception 'slot_unavailable' using errcode = '23P01';
  end if;
  insert into public.appointments (
    client_id, booking_request_id, professional_key, service_name,
    starts_at, ends_at, status, notes
  ) values (
    v_client_id, p_request_id, v_segment_professional, v_segment_names,
    v_segment_start, v_cursor, 'confirmed',
    left('Reserva web confirmada automáticamente ' || v_reference ||
      case when p_waitlist then ' · Acepta lista de espera' else '' end ||
      case when trim(p_notes) <> '' then ' · Clienta: ' || trim(p_notes) else '' end, 600)
  );
  v_appointment_count := v_appointment_count + 1;

  return jsonb_build_object(
    'ok', true,
    'reference', v_reference,
    'appointmentCount', v_appointment_count
  );
exception
  when exclusion_violation then
    raise exception 'slot_unavailable' using errcode = '23P01';
end;
$$;

revoke execute on function public.booking_busy_intervals(date, text[]) from public;
revoke execute on function public.create_public_booking(uuid, text[], text, timestamp, text, text, text, boolean, text) from public;
grant execute on function public.booking_busy_intervals(date, text[]) to anon, authenticated;
grant execute on function public.create_public_booking(uuid, text[], text, timestamp, text, text, text, boolean, text) to anon, authenticated;
