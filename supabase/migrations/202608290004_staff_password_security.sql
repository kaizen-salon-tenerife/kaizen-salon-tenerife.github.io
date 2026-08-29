-- Kaizen · cambio obligatorio de contraseña para cuentas internas
-- Ejecutar una sola vez después de 202608290003_staff_workflows.sql.

alter table public.staff_profiles
add column if not exists must_change_password boolean not null default true;

update public.staff_profiles
set must_change_password = professional_key <> 'adminleon';

create or replace function public.mark_staff_password_changed()
returns void
language sql
security definer
set search_path = public
as $$
  update public.staff_profiles
  set must_change_password = false
  where id = auth.uid() and is_active = true;
$$;

revoke execute on function public.mark_staff_password_changed() from public, anon;
grant execute on function public.mark_staff_password_changed() to authenticated;
