alter table public.owner_alert_settings add column calendar_manual_verified_at timestamptz;
comment on column public.owner_alert_settings.calendar_manual_verified_at is
  'Time the owner-calendar email preferences were verified directly in Google Calendar after reload. This is separate from API verification; calendar_error is preserved.';
