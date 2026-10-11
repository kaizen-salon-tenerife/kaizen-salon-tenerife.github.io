# Accesos de MB Beauty

Actualizado el 11 de octubre de 2026 con autorización de Manuel.

## Equipo vigente

- Nurme (`nurme`): perfil activo, rol `owner`, propietaria con acceso completo a la gestión de MB Beauty.
- Manuel (`adminleon`): perfil activo, rol `admin`, administrador de la página.
- Sarai y Yeroha: perfiles inactivos. Se conservan sus cuentas y relaciones históricas; no aparecen en el equipo activo ni pueden entrar en el panel.

El servidor comprueba Supabase Auth y el perfil activo de `staff_profiles` en cada petición. Las políticas de la base de datos consultan el perfil activo; no se autorizan acciones mediante metadatos editables del usuario. `owner` y `admin` comparten las capacidades de gestión existentes, aunque la interfaz diferencia la propiedad de la administración.

## Cambio aplicado y verificación

Se actualizó `nurme` de `professional` a `owner` y se marcó `is_active = false` para `sarai` y `yeroha`, en una transacción. Manuel conserva su rol `admin`. No se modificaron identificadores, contraseñas, citas, clientas ni registros de tratamientos. Las funciones `current_staff_role`, `current_professional_key` e `is_management` ya comprueban `is_active`; no se cambiaron políticas ni el esquema.

Se verificaron los perfiles resultantes, el acceso de gestión de Nurme y la denegación de acceso para cuentas inactivas. El panel muestra solamente las cuentas activas y ya no presenta la migración de permisos como pendiente.

## Reversión de los perfiles

Solo si se decide revertir este cambio: restaurar `nurme.role = 'professional'` y `is_active = true` para Sarai y Yeroha. Los roles históricos conservados son `owner` para Sarai y `professional` para Yeroha. No hace falta reconstruir datos históricos. Una recarga del panel obtiene los permisos vigentes del servidor.
