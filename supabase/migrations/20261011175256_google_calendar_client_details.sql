-- Requested calendar title and appointment notes. No client contact or clinical data.
grant select (client_id, notes) on public.appointments to service_role;
grant select (id, name) on public.clients to service_role;
