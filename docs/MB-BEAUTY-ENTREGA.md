# MB Beauty: estado de entrega

La web oficial está publicada en https://mb-beauty.leonforge.workers.dev.

## Identidad y accesos

La portada, reservas, privacidad, mensajes y panel utilizan MB Beauty. El equipo conserva sus identificadores de registro, contraseñas, historial y permisos. Los identificadores internos de acceso se actualizaron en Auth y en los perfiles; no se publican en este documento ni son buzones de correo reales. El acceso administrativo conserva el correo personal del propietario.

Las cookies son `mb_beauty_access_token` y `mb_beauty_refresh_token`. El cambio exige iniciar sesión de nuevo. La constante de horario es `MB_BEAUTY_HOURS`; el horario no cambia.

## Producción

Cloudflare utiliza el Worker `mb-beauty` y la configuración `wrangler.jsonc`. El catálogo y las horas disponibles se obtienen del proyecto Supabase `gwndpaeebjtoowuzkywz`, activo. No se modifican datos de citas, clientes, tratamientos ni pagos.

La identidad de Auth se comprueba en el servidor y los permisos dependen de perfiles activos. Las claves privadas no se incluyen en el cliente ni en la documentación. Se mantiene el cambio de contraseña obligatorio que ya tenían las cuentas internas.

## Validación

Build, TypeScript, lint y pruebas de flujos de reservas y personal. En producción se comprueban portada, servicios, disponibilidad, redirección del panel a acceso y rechazo de fotografías privadas sin sesión. No se afirma una prueba de inicio de sesión real ni se crean citas ficticias en producción.

Los nombres históricos del repositorio y de la carpeta son referencias de infraestructura, no identidad visible. La documentación antigua se sustituye por este estado actual; el historial de Git conserva versiones anteriores.