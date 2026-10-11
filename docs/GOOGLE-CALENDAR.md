# Google Calendar de MB Beauty

Estado: cuenta real conectada. El usuario ha comprobado una cita en Google Calendar. Cron */5 * * * * y acceso autenticado al estado verificados en producción. La migración google_calendar_connection está aplicada en Supabase: RLS activa y lectura denegada a anon/authenticated, verificado el 11 de octubre de 2026.

Google Cloud: proyecto «MB Beauty», ID calm-bison-511312-g7, creado en la cuenta del administrador técnico. Google Calendar API habilitada el 11 de octubre de 2026. La marca OAuth «MB Beauty · Agenda» y el cliente web están en producción. Solo se declara calendar.app.created. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_CALENDAR_ENCRYPTION_KEY están guardados en Cloudflare. SUPABASE_SECRET_KEY procede de una clave dedicada mb_beauty_google_calendar y está guardada solo como secreto de producción del Worker.

## Alcance

Las migraciones google_calendar_projection_grants y google_calendar_client_details conceden a service_role SELECT sobre las columnas del perfil necesarias para autorizar, los campos de cita (incluidos client_id y notes) y clients(id, name). La consulta une solamente el nombre de la clienta. No lee teléfonos, correos, notas generales de la ficha, historiales ni fotografías.

Solo las citas confirmadas o finalizadas de Nurme. Las pendientes, canceladas, ausencias y las reasignadas a otra profesional se retiran del calendario dedicado. La web sigue siendo la fuente de verdad: los cambios hechos en Google no vuelven al panel. A petición del usuario, el título es «Nombre de clienta · Servicio» y la descripción incluye las notas de la cita, incluidas las que aporta la clienta al reservar. El aviso de privacidad y la página de conexión describen este envío. Eventos privados con recordatorio 30 minutos antes.

El calendario se crea como secundario con el permiso limitado calendar.app.created. No se solicita acceso al calendario personal. Colores: manicura rosa (4), pedicura verde (10), facial azul (9), cejas/pestañas violeta (3), otros gris (8). Horas locales de la agenda interpretadas en Atlantic/Canary, incluyendo horario de verano.

## Configuración y validación

1. Crear o seleccionar un proyecto Google Cloud y activar Google Calendar API.
2. Configurar Google Auth Platform para uso externo, con la marca MB Beauty. En pruebas añadir la cuenta de Nurme como usuario de prueba.
3. Crear un cliente OAuth de tipo Aplicación web con redirección exacta:
   https://mb-beauty.leonforge.workers.dev/api/google-calendar/callback
4. Guardar solo en secretos del Worker oficial: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALENDAR_ENCRYPTION_KEY (32 bytes aleatorios expresados como 64 caracteres hexadecimales), SUPABASE_SECRET_KEY. Nunca compartirlos en el chat ni guardarlos en Git.
5. Revisar y aplicar la migración google_calendar_connection. RLS activada, permisos de anon/authenticated revocados, solo service_role puede acceder. Verificar los permisos después de aplicarla.
6. Configurar GOOGLE_CALENDAR_ENABLED=true solo en el Worker mb-beauty. No habilitar el Worker histórico. La configuración oficial incluye un Cron Trigger */5 * * * *; verificarlo tras el despliegue para recuperar fallos incluso sin el panel abierto. Sin el cron no se garantiza sincronización de la carga inicial ni reintentos automáticos.
7. Desplegar código, comprobar /panel/google-calendar, y completar el consentimiento desde la cuenta correcta. El usuario completa personalmente el inicio de sesión y la autorización de Google.
8. Validar con una cita de prueba: crear, editar hora, cambiar servicio/color, cancelar, reasignar y repetir sincronización sin duplicados. Verificar el widget en iPhone. No declarar activada la integración antes de estas pruebas.

OAuth en modo Testing con este permiso puede emitir refresh tokens con caducidad de siete días. Para uso estable poner la aplicación en producción y completar cualquier requisito de verificación que indique Google. Revisar también el estado de Supabase para evitar pausas del proyecto.

## Diseño operativo

El callback valida estado aleatorio y cookie HttpOnly Secure SameSite=Lax, usa PKCE y consume un nonce de un solo uso con caducidad de diez minutos. El acceso al resto de rutas verifica la sesión de Supabase y el perfil activo; solo Nurme y el administrador técnico pueden conectar.

El refresh token se cifra con AES-GCM antes de persistir. Las respuestas y logs no contienen tokens. Desconectar revoca el permiso y borra el token local, conservando eventos existentes y el ID del calendario para volver a conectar la misma cuenta.

Tras una respuesta exitosa de creación de reserva web (/api/booking-requests), creación, edición o finalización de cita (/api/appointments), el Worker intenta sincronizar en waitUntil. Antes faltaba el disparador para reservas web. El cron vuelve a intentar cada cinco minutos aunque el panel esté cerrado. Cada pasada procesa hasta 10 modificaciones ordenadas por updated_at e id, con un cursor persistente que avanza tras cada evento confirmado por Google. La importación inicial puede necesitar varias pasadas. Los IDs de eventos se derivan del UUID de cita para impedir duplicados. Una lease atómica de diez minutos evita dos sincronizaciones simultáneas y caduca si el Worker termina inesperadamente. Los eventos cancelados o ausentes se eliminan; 404/410 se consideran ya eliminados. No borrar físicamente citas en SQL: usar su estado de cancelación, ya que no se mantiene un outbox de borrados.

Al desplegar una nueva proyección se reinicia el cursor de la conexión, sin modificar las citas, para actualizar los eventos existentes con los mismos IDs. Un cambio posterior del nombre en la ficha se refleja al editar la cita; las notas de la cita siempre se reflejan en su siguiente sincronización.

Si se renombra un servicio, las citas ya creadas conservan su service_name actual hasta editarlas. Si la autorización se revoca desde Google, la sincronización registra un aviso para volver a conectar. El esquema no incluye un sistema de alertas por correo.

## iPhone

Instalar Google Calendar, iniciar sesión en la cuenta conectada, activar Citas MB Beauty y añadir su widget de eventos. Los colores se verifican en Google Calendar; su representación en el widget depende de iOS y de la app. No se instala un widget propio.
