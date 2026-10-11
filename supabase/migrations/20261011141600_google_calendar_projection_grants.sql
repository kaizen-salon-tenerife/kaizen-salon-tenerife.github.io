-- Server calendar projection needs only these fields, not client details.
grant select (id, professional_key, role, is_active, must_change_password) on public.staff_profiles to service_role;
grant select (id, professional_key, service_name, starts_at, ends_at, status, updated_at) on public.appointments to service_role;
