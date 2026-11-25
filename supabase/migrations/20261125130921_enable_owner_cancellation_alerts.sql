alter table public.owner_booking_alerts drop constraint owner_booking_alerts_appointment_id_key;
alter table public.owner_booking_alerts add constraint owner_booking_alert_event unique(appointment_id,event_key);

-- This private trigger already runs with narrowly controlled definer privileges so
-- client/staff writes can queue a delivery without reading Gmail credentials.
create or replace function private.enqueue_owner_booking_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare alert uuid; event_kind text; v_event_key text; saved jsonb;
begin
  if new.professional_key <> 'nurme' then return new; end if;
  if tg_op='UPDATE' and new.status='cancelled' and old.status in ('pending','confirmed') then
    event_kind:='cancelled';
    v_event_key:='cancelled:'||new.updated_at::text;
    -- Preserve the cancelled slot, service and identity even if staff later edits it.
    saved:=jsonb_build_object('id',new.id,'status','cancelled','starts_at',new.starts_at,
      'service_name',new.service_name,'client',
      (select jsonb_build_object('name',c.name) from public.clients c where c.id=new.client_id));
  elsif new.booking_request_id is not null and new.status='confirmed' then
    if tg_op='UPDATE' and old.status='confirmed' then return new; end if;
    event_kind:='confirmed'; v_event_key:='confirmed';
  else
    return new;
  end if;
  insert into public.owner_booking_alerts(appointment_id,kind,event_key,snapshot)
    values(new.id,event_kind,v_event_key,saved)
    on conflict(appointment_id,event_key) do nothing returning id into alert;
  if alert is null then return new; end if;
  insert into public.owner_alert_deliveries(alert_id,channel,target) values(alert,'email','nurme');
  insert into public.owner_alert_deliveries(alert_id,channel,target)
    select alert,'push',s.id::text from public.owner_push_subscriptions s
    join public.staff_profiles p on p.id=s.user_id
    where s.active and p.is_active and not p.must_change_password and (p.professional_key='nurme' or p.role='admin');
  return new;
end $$;
revoke all on function private.enqueue_owner_booking_alert() from public, anon, authenticated;
-- RLS and service-only grants on the alert tables remain unchanged. No old
-- cancellations are replayed and no external request runs inside the transaction.
