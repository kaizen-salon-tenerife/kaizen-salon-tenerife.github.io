# Google Calendar de MB Beauty

Estado: código local verificado; configuración externa en curso. No está activada ni conectada a una cuenta real. La migración google_calendar_connection está aplicada en Supabase: RLS activa y lectura denegada a anon/authenticated, verificado el 11 de octubre de 2026.

Google Cloud: proyecto «MB Beauty», ID calm-bison-511312-g7, creado en la cuenta del administrador técnico. Google Calendar API habilitada el 11 de octubre de 2026. La marca OAuth «MB Beauty · Agenda» y el cliente web ya están creados. Solo se declara calendar.app.created, clasificado por Google como permiso no sensible. El calendario se autorizará posteriormente con la cuenta de Nurme.

## Alcance

Solo las citas confirmadas o finalizadas de Nurme. Las pendientes, canceladas, ausencias y las reasignadas a otra profesional se retiran del calendario dedicado. La web sigue siendo la fuente de verdad: los cambios hechos en Google no vuelven al panel. No se incluyen nombres, teléfonos, notas, fichas ni imágenes de clientas. Eventos privados con título del servicio y recordatorio 30 minutos antes.

El calendario se crea como secundario con el permiso limitado calendar.app.created. No se solicita acceso al calendario personal. Colores: manicura rosa (4), pedicura verde (10), facial azul (9), cejas/pestañas violeta (3), otros gris (8). Horas locales de la agenda interpretadas en Atlantic/Canary, incluyendo horario de verano.

## Configuración pendiente

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

Tras guardar una cita, el Worker intenta sincronizar en waitUntil. El cron vuelve a intentar. Cada pasada procesa hasta 10 modificaciones ordenadas por updated_at e id, con un cursor persistente que avanza tras cada evento confirmado por Google. La importación inicial puede necesitar varias pasadas. Los IDs de eventos se derivan del UUID de cita para impedir duplicados. Una lease atómica de diez minutos evita dos sincronizaciones simultáneas y caduca si el Worker termina inesperadamente. Los eventos cancelados o ausentes se eliminan; 404/410 se consideran ya eliminados. No borrar físicamente citas en SQL: usar su estado de cancelación, ya que no se mantiene un outbox de borrados.

Si se renombra un servicio, las citas ya creadas conservan su service_name actual hasta editarlas. Si la autorización se revoca desde Google, la sincronización registra un aviso para volver a conectar. El esquema no incluye un sistema de alertas por correo.

## iPhone

Instalar Google Calendar, iniciar sesión en la cuenta conectada, activar Citas MB Beauty y añadir su widget de eventos. Los colores se verifican en Google Calendar; su representación en el widget depende de iOS y de la app. No se instala un widget propio.



