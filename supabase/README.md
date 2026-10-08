# Supabase · MB Beauty

## Primera instalación

1. Abrir el proyecto **MB Beauty** en Supabase.
2. Entrar en **SQL Editor** y crear una consulta nueva.
3. Copiar todo el contenido de `migrations/202608290001_initial_schema.sql`.
4. Ejecutar la consulta una sola vez.
5. Crear las cuentas del equipo y sus filas en `staff_profiles`.
6. Ejecutar una sola vez `migrations/202608290002_public_booking.sql`.
7. Ejecutar una sola vez `migrations/202608290003_staff_workflows.sql`.
8. Ejecutar una sola vez `migrations/202608290004_staff_password_security.sql`.

La migración crea las tablas, índices, validaciones, políticas RLS y el bucket
privado `treatment-photos`. No crea usuarios ni contiene contraseñas.

La segunda migración añade la reserva pública segura, la consulta anónima de
huecos ocupados y guarda las horas como horario local de Tenerife.

La tercera migración completa los permisos de las fichas y guarda de forma
atómica el cierre de la cita, el tratamiento, el cobro y las fotografías.

La cuarta migración obliga a Sarai, Yeroha y Nurme a sustituir su contraseña
temporal la primera vez que entren al panel.

## Seguridad

- Nunca guardar la contraseña de la base de datos ni la clave `service_role` en GitHub.
- La clave pública de Supabase se configurará después como variable del despliegue.
- Las cuentas de Sarai, Yeroha y Nurme se crearán mediante Supabase Auth.
