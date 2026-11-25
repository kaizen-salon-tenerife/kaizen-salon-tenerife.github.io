# Avisos de cancelación

Al cambiar una cita de Nurme de pendiente/confirmada a cancelada, el mismo commit
guarda un aviso independiente y una entrega por correo a Nurme. También prepara
push para los dispositivos activos. Incluye citas web y del panel; no reproduce
cancelaciones antiguas. Repetir el estado cancelado no crea otro aviso.

El aviso conserva nombre, servicios y fecha/hora de Canarias del momento de la
cancelación. No incluye teléfono, fichas ni notas internas. Las tablas continúan
con RLS y acceso exclusivo del servidor. La función de trigger permanece privada.

Las rutas de gestión pública y del panel activan tanto Calendar como la cola de
avisos después de guardar. El cron vuelve a procesarlos cada cinco minutos.
Calendar elimina el evento determinista de la cita; 404/410 significan que ya
está eliminado. Un error conserva el cursor para reintentar. Correo y Calendar
son independientes: la cancelación no se pierde si alguno falla. Los resultados
ambiguos de Gmail requieren revisión antes de reenviar, para evitar duplicados.

Despliegue: aplicar primero `20261125130753_owner_cancellation_alerts.sql`, publicar
el Worker compatible y aplicar `20261125130921_enable_owner_cancellation_alerts.sql`.
La primera migración conserva la función y restricción antiguas durante el cambio.

Verificación: `tests/owner-cancellation.sql` prueba la cola y la instantánea con
rollback; `tests/owner-alerts.test.mjs` comprueba el correo y sus datos escapados;
`tests/google-calendar.test.mjs` comprueba DELETE y el checkpoint del cursor.
