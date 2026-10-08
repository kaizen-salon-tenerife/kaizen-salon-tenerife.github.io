# Publicación de MB Beauty en Cloudflare

URL oficial: https://mb-beauty.leonforge.workers.dev.

## Configuración

La fuente activa es `wrangler.jsonc`, con el nombre `mb-beauty`. El build genera `dist/server/wrangler.json`, que apunta al Worker ESM compilado y a los recursos de `dist/client`. El único binding declarado es `ASSETS`.

Workers Builds sigue `main` del repositorio conectado: build `npm run build` y deploy `npx wrangler deploy`. El Worker oficial tiene el identificador `02553077957345cfafe63e1ef6645048`. El Worker anterior se conserva para compatibilidad, separado del despliegue oficial.

## Comprobaciones

La portada, fotografías, carruseles y formulario de reservas se verificaron en HTTPS. Supabase `gwndpaeebjtoowuzkywz` está activo tras la reactivación autorizada. Se comprobaron catálogo, horas disponibles, salud de Auth y protección de rutas privadas. No se modificaron secretos ni permisos de acceso.

## Recuperación

Consultar las versiones y despliegues del Worker oficial en Cloudflare y restaurar una versión anterior si una publicación falla. Mantener los datos de Supabase: una reversión de interfaz no requiere revertir la base de datos.