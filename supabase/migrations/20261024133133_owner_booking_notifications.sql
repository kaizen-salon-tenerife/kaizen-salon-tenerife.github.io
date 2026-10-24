create schema if not exists private;
create table public.owner_alert_settings (
  id text primary key check (id = 'nurme'),
  email_address text not null default 'nurmemartinbenitez@gmail.com',
  email_refresh_token text,
  email_enabled boolean not null default true,
  nonce text, nonce_expires_at timestamptz, connected_by uuid,
  vapid_public_key text, vapid_private_key text,
  calendar_configured_at timestamptz, calendar_error text
);
insert into public.owner_alert_settings(id) values ('nurme');
create table public.owner_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.staff_profiles(id),
  endpoint text not null unique,
  subscription jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_test_at timestamptz
);
create table public.owner_booking_alerts (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create table public.owner_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.owner_booking_alerts(id) on delete cascade,
  channel text not null check (channel in ('push','email')),
  target text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','uncertain','skipped')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz not null default 'epoch',
  claim_id uuid,
  sent_at timestamptz,
  last_error text,
  unique(alert_id,channel,target)
);
create index owner_alert_deliveries_pending on public.owner_alert_deliveries(next_attempt_at) where status in ('pending','sending');
alter table public.owner_alert_settings enable row level security;
alter table public.owner_push_subscriptions enable row level security;
alter table public.owner_booking_alerts enable row level security;
alter table public.owner_alert_deliveries enable row level security;
revoke all on public.owner_alert_settings, public.owner_push_subscriptions, public.owner_booking_alerts, public.owner_alert_deliveries from anon, authenticated;
grant all on public.owner_alert_settings, public.owner_push_subscriptions, public.owner_booking_alerts, public.owner_alert_deliveries to service_role;

-- Private trigger: an alert and its delivery jobs commit with the booking itself.
-- Only new public bookings are announced; installing this does not replay old bookings.
create function private.enqueue_owner_booking_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare alert uuid;
begin
  if tg_op='UPDATE' and old.status='confirmed' then return new; end if;
  if new.booking_request_id is null or new.professional_key <> 'nurme' or new.status <> 'confirmed' then return new; end if;
  insert into public.owner_booking_alerts(appointment_id) values(new.id)
    on conflict(appointment_id) do nothing returning id into alert;
  if alert is null then return new; end if;
  insert into public.owner_alert_deliveries(alert_id,channel,target) values(alert,'email','nurme');
  insert into public.owner_alert_deliveries(alert_id,channel,target)
    select alert,'push',s.id::text from public.owner_push_subscriptions s
    join public.staff_profiles p on p.id=s.user_id
    where s.active and p.is_active and not p.must_change_password and (p.professional_key='nurme' or p.role='admin');
  return new;
end $$;
revoke all on function private.enqueue_owner_booking_alert() from public, anon, authenticated;
create trigger owner_booking_alert after insert or update of status on public.appointments
for each row execute function private.enqueue_owner_booking_alert();

-- Service-only lease, so concurrent HTTP requests and cron cannot claim the same job.
create function public.claim_owner_alert_deliveries() returns setof public.owner_alert_deliveries
language plpgsql security invoker set search_path = '' as $$
begin
  -- A process may die after Gmail accepted a message but before saving the result.
  -- Do not automatically resend ambiguous email deliveries.
  update public.owner_alert_deliveries set status='uncertain',last_error='El envío de correo se interrumpió. Comprueba si llegó antes de reintentar.'
    where status='sending' and channel='email' and lease_until<now();
  update public.owner_alert_deliveries set status='failed',last_error='Se agotaron los reintentos. Revisa el canal y pulsa Reintentar.'
    where status in ('pending','sending') and attempts>=8 and lease_until<now();
  return query update public.owner_alert_deliveries d
  set status='sending', lease_until=now()+interval '2 minutes', claim_id=gen_random_uuid(), attempts=d.attempts+1
  where d.id in (
    select j.id from public.owner_alert_deliveries j
    where j.status in ('pending','sending') and j.next_attempt_at<=now() and j.lease_until<now()
      and j.attempts<8
      and (j.channel='push' or exists(select 1 from public.owner_alert_settings s where s.id='nurme' and s.email_enabled and s.email_refresh_token is not null))
    order by j.next_attempt_at,j.id for update skip locked limit 4
  ) returning d.*;
end
$$;
revoke all on function public.claim_owner_alert_deliveries() from public, anon, authenticated;
grant execute on function public.claim_owner_alert_deliveries() to service_role;
