# Accesos de MB Beauty: informe previo a cualquier migración

Fecha: 8 de octubre de 2026. **Propuesta pendiente de aprobación; no ejecutada.**

## Situación actual comprobada

- El servidor valida la identidad con Supabase Auth y lee el perfil activo de `staff_profiles`. No autoriza usando `user_metadata`.
- La tabla admite `owner`, `admin` y `professional`. Los identificadores profesionales existentes son `sarai`, `yeroha`, `nurme` y `adminleon`.
- La aplicación transforma `owner` y `admin` en un mismo nivel interno de acceso general. Las políticas SQL también distinguen administración general y acceso por profesional.
- La interfaz anterior describía a Sarai con acceso general y a Nurme/Yeroha con acceso a sus propias citas y clientas. Esto es evidencia del repositorio, no una comprobación de los perfiles remotos actuales.
- Supabase Management confirmó el estado **INACTIVE** del proyecto el 8 de octubre. La consulta de perfiles solo de lectura terminó por timeout. Los roles reales y las políticas instaladas todavía deben contrastarse al restablecer el servicio.
- El rediseño presenta a Nurme Martín como propietaria y administradora operativa, y a Manuel como administrador técnico principal y superadministrador. Estos textos **no conceden permisos**. Un aviso interno informa que los permisos existentes se conservan.
- No se han borrado usuarios, citas, fichas, fotos ni cuentas históricas. No se ha ejecutado ninguna migración ni reactivado el proyecto.

## Cambio propuesto

Después de identificar de forma segura las cuentas correctas: conceder a Nurme el nivel operativo aprobado para agenda, clientas, citas, bloqueos y catálogo. Mantener a Manuel como responsable técnico con el alcance de superadministración acordado. Conservar las cuentas históricas de Sarai y Yeroha y sus relaciones con los registros, sin modificar sus permisos sin una decisión expresa.

No sustituir identificadores profesionales de registros antiguos. Si se necesita separar superadministración de operaciones, diseñar una matriz de capacidades y una comprobación en servidor y RLS: el código actual agrupa `owner` y `admin` y no distingue todas esas capacidades.

## Riesgos

Ampliar el rol de Nurme puede darle acceso a todas las fichas, fotos y datos de cobro. Cambiar permisos de cuentas antiguas afecta a la continuidad operativa. Cambiar identificadores rompería relaciones históricas. Reactivar el proyecto y configurar la nueva URL de Auth son acciones independientes de este rediseño.

## Migración necesaria, antes de autorizar su ejecución

1. Restablecer Supabase con autorización independiente y verificar los perfiles efectivos, usuarios vinculados y políticas instaladas mediante consultas de lectura.
2. Guardar un respaldo seguro de perfiles y políticas fuera del repositorio, sin contraseñas ni claves en logs.
3. Acordar una matriz por acción y cuenta. Identificar los UUID reales de Nurme y Manuel; no identificarlos por metadatos editables.
4. Preparar una migración mínima, transaccional y reversible. No producir ni ejecutar un SQL con usuarios supuestos.
5. Probar en un entorno separado con cuentas de prueba: administración, restricciones por profesional, fotos privadas, reservas, bloqueos y cobros.
6. Presentar la migración final, resultados y rollback a Manuel para su aprobación antes de aplicarla.

## Reversión

Restaurar únicamente los perfiles/capacidades y políticas modificados desde el respaldo. No borrar citas ni rehacer el catálogo. Invalidar/renovar sesiones según el mecanismo de autorización utilizado y volver a comprobar las restricciones por usuario. Mantener disponible la versión anterior del código.

La recomendación de evitar `user_metadata` para autorización coincide con la [documentación oficial de Supabase](https://supabase.com/docs/guides/auth/users).
