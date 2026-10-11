-- Preserve the current booking function and all its existing validations.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.create_public_booking(uuid,text[],text,timestamp without time zone,text,text,text,boolean,text)'::regprocedure) into definition;
  if position('when 6 then time ''13:30''' in definition) = 0 then
    raise exception 'Unexpected booking hours: review function before applying';
  end if;
  execute replace(definition, 'when 6 then time ''13:30''', 'when 6 then null');
end $$;

-- Only Nurme can create or reschedule an active Saturday appointment,
-- including requests sent directly to the authenticated Data API.
create policy "Nurme creates Saturday exceptions"
on public.appointments as restrictive for insert to authenticated
with check (
  extract(dow from starts_at) <> 6
  or (public.current_professional_key() = 'nurme' and public.current_staff_role() = 'owner' and professional_key = 'nurme')
);
create policy "Nurme updates Saturday exceptions"
on public.appointments as restrictive for update to authenticated
using (true)
with check (
  extract(dow from starts_at) <> 6
  or status in ('cancelled', 'no_show', 'completed')
  or (public.current_professional_key() = 'nurme' and public.current_staff_role() = 'owner' and professional_key = 'nurme')
);

