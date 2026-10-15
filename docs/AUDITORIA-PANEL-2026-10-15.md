# Auditoría del panel de MB Nurme Beauty — 15 de octubre de 2026

Revisión de los ocho puntos enviados por Nurme. Se revisaron código, pruebas y datos agregados de producción. No se crearon clientas ni citas reales para probar, ni se fusionaron fichas.

| Punto | Resultado y actuación |
| --- | --- |
| 1. Borrar/cancelar una cita | Ya existe «Cancelar cita», motivo y confirmación. La cancelación conserva el historial, libera el horario y retira la tarjeta de la agenda. Pruebas de cancelación y de eliminación del evento Google pasan. |
| 2. Varios servicios | La creación ya permitía selección múltiple. La edición todavía usaba texto libre; ahora comparte el selector del catálogo, suma las duraciones y permite ajustarlas cada 15 minutos. Se conserva el servicio de citas antiguas cuando no se cambia su selección. |
| 3. Modificar/incorporar servicios | Nurme tiene perfil activo de propietaria y permiso de editar precios, duración y disponibilidad. La pantalla aún no ofrece alta de nuevas definiciones de servicio. Falta recibir la lista de servicios nuevos; no se inventaron nombres ni precios. |
| 4. Citas de 30 minutos en Google | La proyección no filtra por duración y la prueba confirma 10:00–10:30 con zona Atlantic/Canary. La conexión remota estaba activa, sin último error, con sincronización cada cinco minutos. En la consulta no había citas confirmadas/realizadas de exactamente 30 minutos: no puede darse por reproducido el fallo real ni por demostrado su origen. Se necesita identificar una cita afectada si vuelve a ocurrir. |
| 5. Sesión no válida tras varias clientas | No hay un límite de cinco fichas. La renovación de sesión esperaba 45 minutos y se reiniciaba con cada recarga. Se renueva al abrir y volver al panel, cada diez minutos y ante un 401 antes de reintentar una operación una sola vez. Las peticiones simultáneas comparten la renovación. Prueba de ocho altas simuladas, incluida caducidad tras la quinta, sin pérdida ni duplicación del envío. Esto corrige una causa plausible; no reproduce por sí solo el uso real del iPhone. |
| 6. Presentación | Texto cambiado a «Como esteticista, te acompaño en la elección de tus servicios…». |
| 7. Mezcla de clientas | Citas e historiales se asocian por identificador de ficha. No se encontraron citas sin clienta. Hay un grupo de fichas con el mismo nombre; se distinguen en el selector con contacto parcial y referencia de ficha. No se puede concluir que ese sea el origen del caso comunicado sin un ejemplo concreto. |
| 8. Margen de horarios | Pendiente aclarar si se quiere ampliar el horario de atención o permitir excepciones fuera de él. Se conserva L–V 09:30–18:00 y la excepción de sábado exclusiva de Nurme. No se modifica disponibilidad pública sin conocer las horas deseadas. |

## Límites y comprobaciones

La sesión y las escrituras se probaron con datos sintéticos y peticiones interceptadas; no se simula un iPhone real ni se afirman ocho altas reales en producción. Google Calendar se comprobó mediante estado remoto, programación de sincronización y pruebas de su proyección/operaciones. La base de datos, permisos y credenciales permanecen intactos.

Validación: lint, TypeScript, build de producción y 54 pruebas automatizadas.
