-- Keep the existing confirmation alerts; cancellations are separate historical events.
alter table public.owner_booking_alerts
  add column kind text not null default 'confirmed' check (kind in ('confirmed','cancelled')),
  add column event_key text not null default 'confirmed',
  add column snapshot jsonb;
-- Keep the old unique constraint and trigger until the compatible Worker is live.
