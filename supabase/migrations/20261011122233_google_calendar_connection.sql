-- Server-only OAuth storage. Browser roles must never read tokens or nonce state.
create table public.google_calendar_connection (
 id text primary key check (id = 'nurme'), calendar_id text, refresh_token text,
 connected_by uuid references auth.users(id), nonce text, nonce_expires_at timestamptz,
 cursor timestamptz not null default '1970-01-01T00:00:00Z', cursor_id uuid,
 lease_until timestamptz not null default '1970-01-01T00:00:00Z',
 last_synced_at timestamptz, last_error text
);
alter table public.google_calendar_connection enable row level security;
revoke all on public.google_calendar_connection from public, anon, authenticated;
grant select, insert, update, delete on public.google_calendar_connection to service_role;
insert into public.google_calendar_connection (id) values ('nurme');
