-- Kaizen · esquema inicial para Supabase
-- Ejecutar una sola vez desde SQL Editor.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('owner', 'admin', 'professional')),
  professional_key text not null unique check (professional_key in ('sarai', 'yeroha', 'nurme', 'adminleon')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id text primary key,
  category text not null,
  name text not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  duration_label text not null default '',
  price_label text not null default 'A consultar',
  professional_key text not null check (professional_key in ('sarai', 'yeroha', 'nurme')),
  is_active boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  primary_professional_key text not null check (primary_professional_key in ('sarai', 'yeroha', 'nurme')),
  is_test boolean not null default false,
  is_blocked boolean not null default false,
  block_reason text not null default '',
  blocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_professionals (
  client_id uuid not null references public.clients(id) on delete cascade,
  professional_key text not null check (professional_key in ('sarai', 'yeroha', 'nurme')),
  created_at timestamptz not null default now(),
  primary key (client_id, professional_key)
);

create table public.booking_requests (
  id uuid primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  reference text not null unique,
  preferred_professional text not null default 'any' check (preferred_professional in ('any', 'sarai', 'yeroha', 'nurme')),
  service_ids text[] not null default '{}',
  service_summary text not null,
  waitlist boolean not null default false,
  privacy_accepted_at timestamptz not null,
  privacy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  booking_request_id uuid references public.booking_requests(id) on delete set null,
  professional_key text not null check (professional_key in ('sarai', 'yeroha', 'nurme')),
  service_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  status_reason text not null default '',
  completed_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_range check (ends_at > starts_at),
  constraint appointments_no_overlap exclude using gist (
    professional_key with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  professional_key text check (professional_key in ('sarai', 'yeroha', 'nurme')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  created_by uuid not null references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_blocks_valid_range check (ends_at > starts_at)
);

create table public.treatment_records (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  professional_key text not null check (professional_key in ('sarai', 'yeroha', 'nurme')),
  result_notes text not null,
  treatment_details text not null default '',
  photo_authorized boolean not null,
  photo_decline_reason text not null default '',
  aftercare_provided boolean not null default false,
  incident_occurred boolean not null default false,
  incident_notes text not null default '',
  next_recommended_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photo_decline_reason_required check (photo_authorized or char_length(trim(photo_decline_reason)) >= 3),
  constraint incident_notes_required check (not incident_occurred or char_length(trim(incident_notes)) >= 3)
);

create table public.treatment_photos (
  id uuid primary key default gen_random_uuid(),
  treatment_record_id uuid not null references public.treatment_records(id) on delete cascade,
  kind text not null check (kind in ('before', 'after')),
  object_path text not null unique,
  content_type text not null,
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  unique (treatment_record_id, kind)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  professional_key text not null check (professional_key in ('sarai', 'yeroha', 'nurme')),
  amount_cents integer not null check (amount_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  method text not null check (method in ('cash', 'card', 'bizum', 'transfer')),
  status text not null default 'paid' check (status in ('paid', 'pending')),
  notes text not null default '',
  recorded_by uuid not null references public.staff_profiles(id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_discount_valid check (discount_cents <= amount_cents)
);

create table public.whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  kind text not null check (kind in ('confirmation', 'reminder', 'waitlist')),
  slot_key text not null default '',
  message text not null,
  status text not null default 'opened' check (status in ('opened', 'sent')),
  opened_at timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid not null references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, kind, slot_key)
);

create index clients_professional_idx on public.clients(primary_professional_key);
create index clients_phone_idx on public.clients(phone);
create index appointments_professional_start_idx on public.appointments(professional_key, starts_at);
create index appointments_client_idx on public.appointments(client_id);
create index schedule_blocks_professional_start_idx on public.schedule_blocks(professional_key, starts_at);
create index treatment_records_client_idx on public.treatment_records(client_id);
create index payments_professional_status_idx on public.payments(professional_key, status);
create index whatsapp_status_idx on public.whatsapp_notifications(status);

create trigger staff_profiles_updated_at before update on public.staff_profiles for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger booking_requests_updated_at before update on public.booking_requests for each row execute function public.set_updated_at();
create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger schedule_blocks_updated_at before update on public.schedule_blocks for each row execute function public.set_updated_at();
create trigger treatment_records_updated_at before update on public.treatment_records for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger whatsapp_notifications_updated_at before update on public.whatsapp_notifications for each row execute function public.set_updated_at();

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.staff_profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.current_professional_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select professional_key from public.staff_profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_management()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() in ('owner', 'admin'), false);
$$;

alter table public.staff_profiles enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.client_professionals enable row level security;
alter table public.booking_requests enable row level security;
alter table public.appointments enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.treatment_records enable row level security;
alter table public.treatment_photos enable row level security;
alter table public.payments enable row level security;
alter table public.whatsapp_notifications enable row level security;

create policy "Public can read active services" on public.services for select to anon using (is_active = true);
create policy "Staff can read services" on public.services for select to authenticated using (public.current_staff_role() is not null);
create policy "Management can manage services" on public.services for all to authenticated using (public.is_management()) with check (public.is_management());

create policy "Staff reads own profile" on public.staff_profiles for select to authenticated using (id = auth.uid() or public.is_management());
create policy "Management manages profiles" on public.staff_profiles for all to authenticated using (public.is_management()) with check (public.is_management());

create policy "Staff reads assigned clients" on public.clients for select to authenticated using (
  public.is_management()
  or primary_professional_key = public.current_professional_key()
  or exists (select 1 from public.client_professionals cp where cp.client_id = clients.id and cp.professional_key = public.current_professional_key())
);
create policy "Staff inserts clients" on public.clients for insert to authenticated with check (public.current_staff_role() is not null);
create policy "Staff updates assigned clients" on public.clients for update to authenticated using (
  public.is_management() or primary_professional_key = public.current_professional_key()
) with check (public.is_management() or primary_professional_key = public.current_professional_key());
create policy "Management deletes clients" on public.clients for delete to authenticated using (public.is_management());

create policy "Staff reads client assignments" on public.client_professionals for select to authenticated using (
  public.is_management() or professional_key = public.current_professional_key()
);
create policy "Staff creates own assignments" on public.client_professionals for insert to authenticated with check (
  public.is_management() or professional_key = public.current_professional_key()
);
create policy "Management removes assignments" on public.client_professionals for delete to authenticated using (public.is_management());

create policy "Staff reads booking requests" on public.booking_requests for select to authenticated using (
  public.is_management() or exists (
    select 1 from public.client_professionals cp
    where cp.client_id = booking_requests.client_id and cp.professional_key = public.current_professional_key()
  )
);

create policy "Staff reads own appointments" on public.appointments for select to authenticated using (
  public.is_management() or professional_key = public.current_professional_key()
);
create policy "Staff creates own appointments" on public.appointments for insert to authenticated with check (
  public.is_management() or professional_key = public.current_professional_key()
);
create policy "Staff updates own appointments" on public.appointments for update to authenticated using (
  public.is_management() or professional_key = public.current_professional_key()
) with check (public.is_management() or professional_key = public.current_professional_key());
create policy "Management deletes appointments" on public.appointments for delete to authenticated using (public.is_management());

create policy "Staff reads schedule blocks" on public.schedule_blocks for select to authenticated using (public.current_staff_role() is not null);
create policy "Staff creates allowed blocks" on public.schedule_blocks for insert to authenticated with check (
  public.is_management() or professional_key = public.current_professional_key()
);
create policy "Staff updates allowed blocks" on public.schedule_blocks for update to authenticated using (
  public.is_management() or professional_key = public.current_professional_key()
) with check (public.is_management() or professional_key = public.current_professional_key());
create policy "Staff deletes allowed blocks" on public.schedule_blocks for delete to authenticated using (
  public.is_management() or professional_key = public.current_professional_key()
);

create policy "Staff reads own treatment records" on public.treatment_records for select to authenticated using (
  public.is_management() or professional_key = public.current_professional_key()
);
create policy "Staff creates own treatment records" on public.treatment_records for insert to authenticated with check (
  public.is_management() or professional_key = public.current_professional_key()
);
create policy "Staff updates own treatment records" on public.treatment_records for update to authenticated using (
  public.is_management() or professional_key = public.current_professional_key()
) with check (public.is_management() or professional_key = public.current_professional_key());

create policy "Staff reads own photo metadata" on public.treatment_photos for select to authenticated using (
  exists (
    select 1 from public.treatment_records tr
    where tr.id = treatment_photos.treatment_record_id
      and (public.is_management() or tr.professional_key = public.current_professional_key())
  )
);
create policy "Staff writes own photo metadata" on public.treatment_photos for insert to authenticated with check (
  exists (
    select 1 from public.treatment_records tr
    where tr.id = treatment_photos.treatment_record_id
      and (public.is_management() or tr.professional_key = public.current_professional_key())
  )
);
create policy "Staff deletes own photo metadata" on public.treatment_photos for delete to authenticated using (
  exists (
    select 1 from public.treatment_records tr
    where tr.id = treatment_photos.treatment_record_id
      and (public.is_management() or tr.professional_key = public.current_professional_key())
  )
);

create policy "Staff reads own payments" on public.payments for select to authenticated using (
  public.is_management() or professional_key = public.current_professional_key()
);
create policy "Staff creates own payments" on public.payments for insert to authenticated with check (
  public.is_management() or professional_key = public.current_professional_key()
);
create policy "Staff updates own payments" on public.payments for update to authenticated using (
  public.is_management() or professional_key = public.current_professional_key()
) with check (public.is_management() or professional_key = public.current_professional_key());

create policy "Staff reads own notifications" on public.whatsapp_notifications for select to authenticated using (
  public.is_management() or exists (
    select 1 from public.appointments a
    where a.id = whatsapp_notifications.appointment_id and a.professional_key = public.current_professional_key()
  )
);
create policy "Staff creates own notifications" on public.whatsapp_notifications for insert to authenticated with check (
  public.is_management() or exists (
    select 1 from public.appointments a
    where a.id = whatsapp_notifications.appointment_id and a.professional_key = public.current_professional_key()
  )
);
create policy "Staff updates own notifications" on public.whatsapp_notifications for update to authenticated using (
  public.is_management() or exists (
    select 1 from public.appointments a
    where a.id = whatsapp_notifications.appointment_id and a.professional_key = public.current_professional_key()
  )
);

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select, insert, update, delete on public.staff_profiles, public.clients, public.client_professionals,
  public.booking_requests, public.appointments, public.schedule_blocks, public.treatment_records,
  public.treatment_photos, public.payments, public.whatsapp_notifications to authenticated;
grant insert, update, delete on public.services to authenticated;
revoke execute on function public.current_staff_role() from public, anon;
revoke execute on function public.current_professional_key() from public, anon;
revoke execute on function public.is_management() from public, anon;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.current_professional_key() to authenticated;
grant execute on function public.is_management() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('treatment-photos', 'treatment-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Staff reads permitted treatment photos" on storage.objects for select to authenticated using (
  bucket_id = 'treatment-photos'
  and (public.is_management() or (storage.foldername(name))[1] = public.current_professional_key())
);
create policy "Staff uploads permitted treatment photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'treatment-photos'
  and (public.is_management() or (storage.foldername(name))[1] = public.current_professional_key())
);
create policy "Staff updates permitted treatment photos" on storage.objects for update to authenticated using (
  bucket_id = 'treatment-photos'
  and (public.is_management() or (storage.foldername(name))[1] = public.current_professional_key())
) with check (
  bucket_id = 'treatment-photos'
  and (public.is_management() or (storage.foldername(name))[1] = public.current_professional_key())
);
create policy "Staff deletes permitted treatment photos" on storage.objects for delete to authenticated using (
  bucket_id = 'treatment-photos'
  and (public.is_management() or (storage.foldername(name))[1] = public.current_professional_key())
);

insert into public.services (id, category, name, duration_minutes, duration_label, price_label, professional_key, sort_order) values
('manicure-semi-refuerzo', 'Manicura y uñas', 'Semipermanente con refuerzo', 60, '1 h aprox.', '25–28 €', 'nurme', 10),
('manicure-tradicional', 'Manicura y uñas', 'Manicura tradicional', 30, '30 min aprox.', '20 €', 'nurme', 20),
('manicure-softgel', 'Manicura y uñas', 'Softgel (S, M, L o XL)', 120, '1 h 30 min–2 h', 'Desde 25 €', 'nurme', 30),
('manicure-acrilico', 'Manicura y uñas', 'Acrílico (S, M, L o XL)', 120, '2 h aprox.', 'Desde 35 €', 'nurme', 40),
('manicure-relleno', 'Manicura y uñas', 'Relleno de Softgel o acrílico', 90, '1 h 30 min aprox.', 'Desde 30 €', 'nurme', 50),
('manicure-retiro', 'Manicura y uñas', 'Retiro del sistema', 30, '30 min aprox.', 'A consultar', 'nurme', 60),
('manicure-reparacion', 'Manicura y uñas', 'Reparación de uñas', 15, '15 min aprox.', '2 € por uña', 'nurme', 70),
('manicure-decoracion', 'Manicura y uñas', 'Decoración con pedrería', 15, 'Según diseño', 'A consultar', 'nurme', 75),
('pedicura-semi', 'Pedicura', 'Pedicura semipermanente', 60, '1 h aprox.', '25 €', 'nurme', 80),
('pedicura-tradicional', 'Pedicura', 'Pedicura tradicional', 60, '1 h aprox.', '20 €', 'nurme', 90),
('facial-higiene', 'Faciales', 'Higiene facial profunda', 60, '1 h aprox.', '40 €', 'nurme', 100),
('facial-tratamiento', 'Faciales', 'Limpieza facial + tratamiento', 60, '45 min–1 h', '50 €', 'nurme', 105),
('facial-dermapen', 'Faciales', 'Dermapen facial', 45, '45 min aprox.', '40 €', 'nurme', 110),
('facial-dermapen-capilar', 'Faciales', 'Dermapen capilar', 30, '30 min aprox.', '40 €', 'nurme', 120),
('facial-dermapen-ojeras-labios', 'Faciales', 'Dermapen de ojeras', 30, '30 min aprox.', 'A consultar', 'nurme', 130),
('facial-dermapen-labios', 'Faciales', 'Dermapen de labios', 30, '30 min aprox.', 'A consultar', 'nurme', 135),
('facial-radiofrecuencia', 'Faciales', 'Radiofrecuencia facial', 45, '45 min aprox.', '40 €', 'nurme', 140),
('cejas-pinza', 'Cejas y pestañas', 'Depilación de cejas con pinza', 20, '20 min aprox.', '5 €', 'nurme', 145),
('cejas-hilo', 'Cejas y pestañas', 'Depilación de cejas con hilo', 15, '15 min aprox.', '10 €', 'nurme', 150),
('pestanas-clasicas', 'Cejas y pestañas', 'Extensiones clásicas', 120, '2 h aprox.', '50 €', 'nurme', 160),
('pestanas-3d', 'Cejas y pestañas', 'Extensiones 3D', 120, '2 h aprox.', 'Desde 50 €', 'nurme', 170),
('pestanas-4d', 'Cejas y pestañas', 'Extensiones 4D o superior', 120, '2 h aprox.', 'A consultar', 'nurme', 180),
('pestanas-lifting-tinte', 'Cejas y pestañas', 'Lifting de pestañas con tinte', 45, '45 min aprox.', '25 €', 'nurme', 190),
('cejas-laminacion', 'Cejas y pestañas', 'Laminación de cejas', 45, '45 min aprox.', 'A consultar', 'nurme', 200),
('cejas-henna', 'Cejas y pestañas', 'Henna de cejas', 45, '45 min aprox.', 'A consultar', 'nurme', 210),
('micro-cejas', 'Micropigmentación', 'Micropigmentación de cejas', 120, '2 h aprox.', 'A consultar', 'sarai', 220),
('micro-labios', 'Micropigmentación', 'Micropigmentación de labios', 120, '2 h aprox.', 'A consultar', 'sarai', 230),
('micro-estrias', 'Micropigmentación', 'Micropuntura de estrías', 90, 'Desde 1 h', 'A consultar', 'sarai', 240),
('tatuaje-fine-line', 'Tatuajes', 'Tatuaje fine line', 120, 'Tiempo a consultar', 'A consultar', 'yeroha', 250),
('tatuaje-personalizado', 'Tatuajes', 'Tatuaje personalizado', 180, 'Tiempo a consultar', 'A consultar', 'yeroha', 260)
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  duration_label = excluded.duration_label,
  price_label = excluded.price_label,
  professional_key = excluded.professional_key,
  sort_order = excluded.sort_order;
