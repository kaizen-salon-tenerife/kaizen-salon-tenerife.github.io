-- Kaizen · cierre atómico de citas y permisos completos del equipo
-- Ejecutar una sola vez después de 202608290002_public_booking.sql.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
]
where id = 'treatment-photos';

drop policy if exists "Management deletes clients" on public.clients;
create policy "Staff deletes assigned clients"
on public.clients for delete to authenticated using (
  public.is_management()
  or primary_professional_key = public.current_professional_key()
  or exists (
    select 1 from public.client_professionals cp
    where cp.client_id = clients.id
      and cp.professional_key = public.current_professional_key()
  )
);

create or replace function public.complete_staff_appointment(
  p_appointment_id uuid,
  p_record_id uuid,
  p_result_notes text,
  p_treatment_details text,
  p_photo_authorized boolean,
  p_photo_decline_reason text,
  p_aftercare_provided boolean,
  p_incident_occurred boolean,
  p_incident_notes text,
  p_next_recommended_date date,
  p_payment_amount_cents integer,
  p_payment_discount_cents integer,
  p_payment_method text,
  p_payment_status text,
  p_payment_notes text,
  p_photos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_photo jsonb;
  v_now timestamptz := now();
begin
  select * into v_appointment
  from public.appointments
  where id = p_appointment_id
  for update;

  if not found
    or (not public.is_management()
      and v_appointment.professional_key <> public.current_professional_key()) then
    raise exception 'appointment_forbidden';
  end if;
  if v_appointment.status <> 'confirmed' then
    raise exception 'appointment_not_confirmed';
  end if;
  if char_length(trim(p_result_notes)) < 2 then
    raise exception 'result_notes_required';
  end if;
  if not p_photo_authorized and char_length(trim(p_photo_decline_reason)) < 2 then
    raise exception 'photo_decline_reason_required';
  end if;
  if p_incident_occurred and char_length(trim(p_incident_notes)) < 2 then
    raise exception 'incident_notes_required';
  end if;
  if p_payment_amount_cents < 0
    or p_payment_discount_cents < 0
    or p_payment_discount_cents > p_payment_amount_cents
    or p_payment_method not in ('cash', 'card', 'bizum', 'transfer')
    or p_payment_status not in ('paid', 'pending') then
    raise exception 'invalid_payment';
  end if;

  insert into public.treatment_records (
    id, appointment_id, client_id, professional_key, result_notes,
    treatment_details, photo_authorized, photo_decline_reason,
    aftercare_provided, incident_occurred, incident_notes,
    next_recommended_date
  ) values (
    p_record_id,
    v_appointment.id,
    v_appointment.client_id,
    v_appointment.professional_key,
    trim(p_result_notes),
    left(trim(p_treatment_details), 600),
    p_photo_authorized,
    case when p_photo_authorized then '' else left(trim(p_photo_decline_reason), 240) end,
    p_aftercare_provided,
    p_incident_occurred,
    case when p_incident_occurred then left(trim(p_incident_notes), 400) else '' end,
    p_next_recommended_date
  );

  for v_photo in select value from jsonb_array_elements(p_photos)
  loop
    if (v_photo->>'kind') not in ('before', 'after')
      or (v_photo->>'content_type') not in (
        'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
      )
      or (v_photo->>'size_bytes')::integer not between 1 and 10485760 then
      raise exception 'invalid_photo';
    end if;
    insert into public.treatment_photos (
      id, treatment_record_id, kind, object_path, content_type, size_bytes
    ) values (
      (v_photo->>'id')::uuid,
      p_record_id,
      v_photo->>'kind',
      v_photo->>'object_path',
      v_photo->>'content_type',
      (v_photo->>'size_bytes')::integer
    );
  end loop;

  insert into public.payments (
    appointment_id, client_id, professional_key, amount_cents,
    discount_cents, method, status, notes, recorded_by, paid_at
  ) values (
    v_appointment.id,
    v_appointment.client_id,
    v_appointment.professional_key,
    p_payment_amount_cents,
    p_payment_discount_cents,
    p_payment_method,
    p_payment_status,
    left(trim(p_payment_notes), 400),
    auth.uid(),
    case when p_payment_status = 'paid' then v_now else null end
  );

  update public.appointments
  set status = 'completed', completed_at = v_now, hold_expires_at = null
  where id = v_appointment.id;

  return jsonb_build_object('ok', true, 'recordId', p_record_id);
end;
$$;

revoke execute on function public.complete_staff_appointment(
  uuid, uuid, text, text, boolean, text, boolean, boolean, text,
  date, integer, integer, text, text, text, jsonb
) from public, anon;
grant execute on function public.complete_staff_appointment(
  uuid, uuid, text, text, boolean, text, boolean, boolean, text,
  date, integer, integer, text, text, text, jsonb
) to authenticated;
