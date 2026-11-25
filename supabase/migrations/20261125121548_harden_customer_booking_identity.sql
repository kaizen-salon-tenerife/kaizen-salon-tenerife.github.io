do $$
declare definition text;
begin
  select pg_get_functiondef('public.manage_customer_booking(text,text,text,date,timestamp without time zone,text[],text)'::regprocedure) into definition;
  if position('md5(string_agg(id::text||updated_at::text' in definition)=0 then raise exception 'Unexpected management function'; end if;
  definition:=replace(definition,'md5(string_agg(id::text||updated_at::text','md5(string_agg(id::text||updated_at::text||starts_at::text||ends_at::text||service_name||status');
  definition:=replace(definition,'if total_count=0 then','if exists(select 1 from public.appointments where booking_request_id=booking.id and client_id<>booking.client_id) then return jsonb_build_object(''error'',''not_found''); end if;'||chr(10)||'  if total_count=0 then');
  execute definition;
end $$;
