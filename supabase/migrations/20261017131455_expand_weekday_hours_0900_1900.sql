-- Expand weekday booking hours without replacing the existing booking validations,
-- weekend closures, permissions, identity matching or conflict checks.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.create_public_booking(uuid,text[],text,timestamp without time zone,text,text,text,boolean,text)'::regprocedure) into definition;
  if position('else time ''18:00''' in definition) = 0
    or position('p_starts_at::time < time ''09:30''' in definition) = 0
    or position('when 6 then null' in definition) = 0
    or position('when 0 then null' in definition) = 0 then
    raise exception 'Unexpected booking hours: review function before applying';
  end if;
  definition := replace(definition, 'else time ''18:00''', 'else time ''19:00''');
  definition := replace(definition, 'p_starts_at::time < time ''09:30''', 'p_starts_at::time < time ''09:00''');
  execute definition;
end $$;
