# Avisos de nuevas reservas

Las reservas web confirmadas de Nurme generan un aviso y sus trabajos de envío
en la misma transacción de base de datos. No se anuncian citas históricas al
instalarlo ni citas introducidas por el equipo. Estas últimas siguen disponibles
en las confirmaciones manuales de WhatsApp.

## Activación

Desde `/panel/avisos`, Nurme o administración pueden:

1. Registrar cada dispositivo y enviar una notificación de prueba. En iPhone se
   requiere añadir la web a la pantalla de inicio, abrir ese icono, iniciar sesión
   y permitir notificaciones (iOS 16.4 o posterior).
2. Conectar **nurmemartinbenitez@gmail.com** con `openid email gmail.send` y enviar
   un correo de prueba. Gmail API debe estar habilitada en el proyecto Google
   Cloud existente. La autorización usa el mismo retorno OAuth autorizado que
   Calendar, con propósito, PKCE, nonce consumible y comprobación de cuenta.
3. Consultar el estado de Google Calendar. La sincronización configura en el
   calendario creado por la aplicación los correos de alta, cambio y cancelación,
   preservando preferencias adicionales. Mantiene el recordatorio de 30 minutos
   de cada cita. Google puede omitir correos por cambios de la propia cuenta;
   este canal no garantiza un aviso inmediato de nueva reserva.

Los permisos de Google requieren autorización del titular. La conexión no lee
la bandeja de entrada. Revocar Calendar puede revocar otros tokens de la misma
aplicación; se limpia entonces también la conexión de Gmail para mostrar el
estado real.

## Entrega y recuperación

El Worker intenta los trabajos después de una reserva guardada. El cron existente
reintenta cada cinco minutos. Un lote reclama hasta cuatro trabajos con lease y
`SKIP LOCKED`; cada actualización exige el identificador de esa reclamación.
Los reintentos tienen espera creciente y un máximo de ocho intentos. Si la cita
se cancela antes del envío, el aviso se omite.

Cada dispositivo tiene su propio trabajo y las suscripciones caducadas se
desactivan. Los avisos push usan cifrado aes128gcm y VAPID; las claves VAPID privadas
y los tokens de Gmail se guardan cifrados con AES-GCM. Los endpoints push aceptados
se limitan a los proveedores de Apple, Google, Mozilla y Microsoft, sin redirecciones.
Las tablas de avisos, credenciales y dispositivos tienen RLS y acceso exclusivo de
servidor; los endpoints comprueban sesión, perfil activo, rol y origen en escrituras.

Si el envío de un correo queda interrumpido sin respuesta de Gmail, se marca como
resultado incierto, para que el operador compruebe la bandeja antes de reenviar.
Un lease de correo vencido también se considera incierto. No se promete entrega
exactamente una vez ante un fallo entre el envío y la confirmación persistida.

La página conserva un historial de avisos enlazado con cada cita, permite marcarlos
como revisados y muestra los fallos por canal. «Aceptado por el servicio» confirma
la respuesta del proveedor, no que el teléfono haya mostrado el aviso. La recepción
se verifica con las pruebas desde el iPhone, revisando conexión, permisos, ajustes
de Gmail/Calendar y modos de Concentración.

## Validación

- Pruebas locales: selección de destinatarios, control de origen y autenticación,
  contenido y horario local, correo aceptado/ambiguo/cita cancelada, cifrado push y
  suscripción caducada, OAuth y replay, preferencias de Calendar.
- Base de datos: comprobaciones transaccionales con rollback para aviso único,
  trabajo de correo, permisos, reclamación exclusiva y recuperación de lease de
  correo ambiguo. No se conservan citas sintéticas.
- Pruebas reales pendientes de la autorización de Gmail y del dispositivo de Nurme.

## Comprobación real, 25 de octubre de 2026

Gmail de Nurme quedó autorizado y un correo de prueba aceptado por Gmail se
localizó en su bandeja de Recibidos. No se creó ninguna cita de prueba.

La API devolvió 401 para las preferencias Calendar, mientras que la sincronización
de citas siguió funcionando. Los avisos de Nuevos eventos, Eventos modificados y
Eventos cancelados se configuraron directamente en la cuenta de Nurme, calendario
«Citas MB Nurme Beauty», y se comprobaron tras recargar: los tres muestran «Correo».
Se registra esta verificación en `calendar_manual_verified_at`; el error de API
se conserva y no se presenta como una verificación de API satisfactoria.

La recepción de push en el iPhone continúa pendiente de registrar ese dispositivo
y comprobar allí el aviso de prueba.
