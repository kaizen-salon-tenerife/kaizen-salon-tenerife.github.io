# Gestión de citas por la clienta

`/mi-cita` permite consultar una reserva pública con referencia y teléfono completo.
Se accede desde el inicio, el menú móvil, el pie y la confirmación de reserva.
Las reservas antiguas con referencia también funcionan; las citas creadas por el
equipo sin referencia requieren contacto directo con Nurme.

El Worker intercepta `/api/manage-booking`: origen oficial, POST, sin caché,
sin credenciales en URL o almacenamiento del navegador. La consulta está limitada
a 12 intentos por dirección de conexión cada 15 minutos. Emite un ticket AES-GCM
de 30 minutos, específico de esta finalidad. Las demás operaciones requieren ese
ticket y tienen un límite adicional de 120 peticiones cada 15 minutos. El servidor
deriva las claves del límite de CF-Connecting-IP y la clave de cifrado existente.
Los datos devueltos no incluyen teléfonos, fichas ni notas internas.

Las funciones y la tabla de límites admiten únicamente service_role. RLS y la
revocación de grants impiden consultar o mutar reservas a través del RPC anónimo.
La función comprueba además que todas las citas siguen perteneciendo a la clienta
de la reserva, y verifica una revisión antes de modificar o cancelar.

Hasta 6 horas antes de la cita se permite cancelarla completa o cambiar fecha,
hora y opcionalmente servicios. Una reserva histórica con varias profesionales
requiere gestión directa para modificarla. Los cambios conservan la duración
real si no cambia la selección de servicios; si cambia, se recalcula con el
catálogo activo de Nurme. Se validan horas de Canarias, lunes a viernes 09–19,
duración completa, bloqueos y solapamientos. La restricción GiST y las
transacciones protegen frente a carreras. Cancelar preserva el historial.

Las modificaciones se confirman en BD antes de disparar syncCalendar mediante
waitUntil. El cron existente reintenta; Google no recibe la petición si la
transacción ha fallado. No se incorporan correos directos de cancelación.

Validación: tests de HTTP/tickets/límites y tests SQL transaccionales con rollback
(`tests/customer-booking.sql`) para identidad, permisos, horarios, bloqueo,
reprogramación, revisión obsoleta, límite de antelación y cancelación idempotente.
Las pruebas SQL no conservan clientas o citas sintéticas ni envían correos.
