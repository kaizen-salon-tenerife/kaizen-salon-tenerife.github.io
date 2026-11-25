-- Retain invoker security and grant only the fields this server operation uses.
grant select(id,client_id,reference),update(waitlist,service_ids,service_summary) on public.booking_requests to service_role;
grant select(id,name,phone,is_blocked) on public.clients to service_role;
grant select(id,client_id,booking_request_id,professional_key,starts_at,ends_at,service_name,status,updated_at),
  update(starts_at,ends_at,service_name,status,status_reason) on public.appointments to service_role;
grant select(id,name,is_active,professional_key,duration_minutes) on public.services to service_role;
grant select(professional_key,starts_at,ends_at) on public.schedule_blocks to service_role;
do $$
declare definition text;
begin
  select pg_get_functiondef('public.manage_customer_booking(text,text,text,date,timestamp without time zone,text[],text)'::regprocedure) into definition;
  definition:=replace(definition,'select b.* into booking','select b.id,b.client_id,b.reference into booking.id,booking.client_id,booking.reference');
  definition:=replace(definition,'select * into person from public.clients','select id,name,is_blocked into person.id,person.name,person.is_blocked from public.clients');
  definition:=replace(definition,'select * into appt from public.appointments','select id,professional_key,starts_at,ends_at,service_name into appt.id,appt.professional_key,appt.starts_at,appt.ends_at,appt.service_name from public.appointments');
  execute definition;
end $$;
