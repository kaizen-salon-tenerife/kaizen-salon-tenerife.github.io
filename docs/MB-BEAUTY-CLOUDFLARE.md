# Cloudflare: transición a MB Beauty

**Preparado para revisión. No se ha publicado, hecho push ni cambiado ningún Worker remoto.**

## Fuente de configuración

La fuente activa es `wrangler.jsonc`. `vite.config.ts` carga `@cloudflare/vite-plugin`, con ajustes locales para la entrada `worker/index.ts`; el build genera `dist/server/wrangler.json` que apunta al Worker compilado y a `../client`. El archivo generado no es la fuente a editar.

`wrangler.mb-beauty.jsonc` contiene la configuración candidata con `name: mb-beauty`. La configuración activa conserva `kaizen-salon-tenerife` hasta la aprobación de Manuel. El nombre del paquete y el nombre de aplicación ya son MB Beauty; no ejecutar el comando de deploy por defecto sin seleccionar explícitamente el destino.

El único binding declarado es `ASSETS`, para archivos estáticos. No aparecen KV, D1, R2, Durable Objects, Service Bindings ni rutas de dominio en la configuración versionada. `.openai/hosting.json` conserva el identificador histórico del proyecto, sin D1/R2. Eso no prueba que no existan recursos o secretos adicionales configurados desde el dashboard.

## Integración GitHub

El remoto sigue siendo el repositorio histórico de Kaizen. No hay workflows `.github` versionados. El README anterior menciona Workers Builds, pero el repositorio no demuestra que esté conectado ni qué rama dispara despliegues. No hay un conector de Cloudflare disponible para inspeccionar el dashboard. Antes de cualquier push/merge, Manuel debe revisar Workers Builds: repositorio, rama, comandos, nombre del Worker, raíz y variables. La aprobación de la web no sustituye esta comprobación.

Cloudflare exige que el nombre del Worker de Builds coincida con su configuración. Véanse [configuración de Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/) y [comandos de Workers](https://developers.cloudflare.com/workers/wrangler/commands/workers/).

## Efecto esperado y publicación tras aprobación

Publicar con el nombre `mb-beauty` apunta a otro Worker: se creará si no existe, o se actualizará si ya existe en esa cuenta. No es un renombrado automático del Worker antiguo. La URL esperada es `https://mb-beauty.leonforge.workers.dev`, pendiente de comprobar cuenta, subdominio y disponibilidad.

1. Confirmar que el nombre nuevo no pertenece a otro proyecto y registrar la versión activa del Worker antiguo.
2. Comprobar bindings/secretos remotos y la integración de Builds. No copiar credenciales a código ni logs.
3. Restablecer Supabase y pasar pruebas reales de acceso y reservas antes de publicar.
4. Sustituir la fuente activa por la candidata tras aprobación. Crear/verificar la integración nueva sin repuntar ni eliminar el Worker antiguo.
5. Ejecutar instalación limpia, lint, typecheck, tests y build. Revisar que la configuración generada usa `mb-beauty`.
6. Usar el comando aprobado con destino explícito: `npm run deploy:cloudflare -- --name mb-beauty`. Este comando **no se ha ejecutado**.
7. Probar recursos estáticos, rutas internas y Auth en HTTPS. Actualizar la URL definitiva/canonical y las URLs permitidas de Auth solo después de confirmarlas y aprobarlo. Las cookies de sesión no se transfieren entre los dos dominios; habrá que iniciar sesión en el nuevo.
8. Mantener temporalmente el Worker antiguo en su URL actual. No configurar redirecciones ni retirar la web antigua hasta confirmar la transición.

## Rollback

Conservar el Worker antiguo y su integración separados. Si falla el nuevo, devolver enlaces de entrada a la URL antigua y revertir la configuración/local commits del rebranding mediante commits de reversión. Si se publicó una versión errónea del Worker nuevo, restaurar su versión previa desde Cloudflare. No aplicar rollback a Supabase: esta tarea no ha modificado datos ni esquema. No borrar el Worker antiguo ni datos históricos como parte de la reversión.
