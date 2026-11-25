-- Run inside a transaction; no email or calendar fixture survives the rollback.
begin;
do $$
declare cid uuid:=gen_random_uuid(); bid uuid:=gen_random_uuid(); aid uuid:=gen_random_uuid(); saved jsonb;
begin
  if has_table_privilege('anon','public.owner_booking_alerts','select') or has_table_privilege('authenticated','public.owner_booking_alerts','select') then raise exception 'Alert data exposed'; end if;
  insert into public.clients(id,name,phone,primary_professional_key,is_test)
    values(cid,'PRUEBA CANCELACIÓN TRANSACCIONAL','000000626','nurme',true);
  insert into public.booking_requests(id,client_id,reference,service_ids,service_summary,privacy_accepted_at,privacy_version)
    values(bid,cid,'KZ-CANTST',array['pestanas-retiro'],'Retiro de pestañas',now(),'test');
  insert into public.appointments(id,client_id,booking_request_id,professional_key,service_name,starts_at,ends_at,status)
    values(aid,cid,bid,'nurme','Retiro de pestañas','2096-01-02T09:00','2096-01-02T09:15','confirmed');
  if (select count(*) from public.owner_booking_alerts where appointment_id=aid and kind='confirmed')<>1 then raise exception 'Missing confirmation'; end if;
  update public.appointments set status='cancelled' where id=aid;
  select snapshot into saved from public.owner_booking_alerts where appointment_id=aid and kind='cancelled';
  if saved is null or saved->>'service_name'<>'Retiro de pestañas' or saved#>>'{client,name}'<>'PRUEBA CANCELACIÓN TRANSACCIONAL' then raise exception 'Missing cancellation snapshot'; end if;
  if not exists(select 1 from public.owner_alert_deliveries d join public.owner_booking_alerts a on a.id=d.alert_id where a.appointment_id=aid and a.kind='cancelled' and d.channel='email' and d.status='pending') then raise exception 'Email not queued'; end if;
  update public.appointments set status='cancelled',service_name='CAMBIO POSTERIOR' where id=aid;
  if (select count(*) from public.owner_booking_alerts where appointment_id=aid and kind='cancelled')<>1 then raise exception 'Duplicate cancellation'; end if;
  if (select snapshot from public.owner_booking_alerts where appointment_id=aid and kind='cancelled')<>saved then raise exception 'Cancellation details changed'; end if;
  -- Panel appointments have no booking request but must also announce cancellations.
  aid:=gen_random_uuid();
  insert into public.appointments(id,client_id,professional_key,service_name,starts_at,ends_at,status)
    values(aid,cid,'nurme','Cita del panel','2096-01-02T10:00','2096-01-02T10:30','confirmed');
  if exists(select 1 from public.owner_booking_alerts where appointment_id=aid) then raise exception 'Panel confirmation behavior changed'; end if;
  update public.appointments set status='cancelled' where id=aid;
  if not exists(select 1 from public.owner_booking_alerts where appointment_id=aid and kind='cancelled') then raise exception 'Panel cancellation missing'; end if;
end $$;
rollback;
