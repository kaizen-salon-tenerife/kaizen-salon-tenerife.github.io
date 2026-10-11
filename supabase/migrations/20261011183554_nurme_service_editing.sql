-- Nurme can edit her service catalog without granting general management access.
create policy "Nurme updates own services" on public.services
for update to authenticated
using (public.current_professional_key() = 'nurme' and professional_key = 'nurme')
with check (public.current_professional_key() = 'nurme' and professional_key = 'nurme');
