# MB Beauty: entrega local y auditoría

8 de octubre de 2026 · Rama `rebrand/mb-beauty` · Pendiente de aprobación de Manuel para publicar.

## Resultado

Portada nueva con cabecera y menú móvil, emblema MB Beauty, título y llamadas a reserva en HTML, cuatro familias de servicios documentados para Nurme, presentación personal, galería y testimonios sin contenido inventado, contacto y pie con Instagram actualizado. Reserva, acceso, cambio de contraseña, privacidad, mensajes y panel llevan la nueva identidad.

Paleta marfil/beige, taupe y carbón para textos y botones, champagne en detalles. Georgia aporta la serif editorial y Arial/Helvetica mantiene legible la interfaz sin depender de descargas externas. Se han eliminado las animaciones de entrada de la portada y se respeta movimiento reducido. Imágenes de manicura y facial identificadas como corporativas, nunca como resultados reales. No se inventan certificaciones, trayectoria, opiniones ni tratamientos.

La imagen suministrada como hero es un emblema cuadrado sobre marfil; se utiliza como pieza de marca. Los iconos y la marca pequeña se derivan de ese emblema limpio. El PNG transparente original y su copia WebP se conservan, junto a todos los originales con doble extensión en `incoming/`. No se ha generado ni retocado creativamente ninguna imagen. WebP a 480/960 px, `srcSet`, carga diferida de servicios y prioridad solo en portada; hero y servicios derivados suman aproximadamente 369 KB entre todos sus tamaños, frente a 8,88 MB de originales totales. El navegador carga el tamaño apropiado, no todos a la vez.

## Auditoría inicial y protección

- `git status` inicial: rama `main`, únicamente `public/brand/` sin seguimiento. No había cambios de código del usuario. Se creó la rama solicitada antes del rediseño.
- Framework: React 19, Next.js 16 mediante Vinext/Vite. CSS global y Tailwind/PostCSS. Worker ESM en Cloudflare.
- Rutas existentes: `/`, `/reservar`, `/privacidad`, `/panel`, `/panel/acceso`, `/panel/cambiar-clave` y las API de servicios, disponibilidad, reserva, Auth, citas, clientes, pagos, bloqueos y tratamientos. El panel cambia agenda/clientes/historial por estado del cliente, no por rutas independientes.
- No existía recuperación por correo. Se añadió `/panel/recuperar-clave` con información real y contacto con el administrador, sin fingir envío de emails ni modificar Auth. Se añadió una página 404 de marca.
- Fuente activa Cloudflare: `wrangler.jsonc`. Configuración nueva solo candidata en `wrangler.mb-beauty.jsonc`. Integración del dashboard pendiente de comprobación; no hubo push, merge ni despliegue.
- No se modificaron migraciones, perfiles, políticas, triggers, funciones, buckets ni claves. Solo se corrigió un estrechamiento de tipos preexistente en el cliente HTTP de Supabase. Los textos API de marca y la versión del aviso que se enviará en futuras reservas cambiaron; no se ejecutó una reserva real.
- La identidad de Auth se comprueba contra el servidor y perfiles activos; no se añadió autorización mediante metadatos editables.

## Variables y configuración, solo nombres

No se encontraron archivos `.env*` en la raíz. El código conserva `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` existentes, sin reproducir sus valores aquí. No hay nuevas claves ni variables secretas.

Variables de herramientas: `CODEX_SANDBOX`, `WRANGLER_WRITE_LOGS`, `WRANGLER_LOG_PATH`, `MINIFLARE_REGISTRY_PATH`. Los scripts Bash conservan `SITES_ENV_READY`, `SITES_PROJECT_ROOT`, `SITES_RUNTIME_ROOT`, `SITES_NPM_CACHE_SEED`, `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, `SITES_BUILD_KILL_AFTER`, y configuración npm/XDG/TMP del entorno. No se cambió ningún secreto remoto.

## Archivos modificados o añadidos

| Grupo | Archivos | Finalidad |
| --- | --- | --- |
| Portada | `app/page.tsx`, `app/components/mobile-navigation.tsx`, `app/mb-beauty.css`, `app/globals.css` | Rediseño, navegación accesible, paleta y legibilidad de formularios/panel |
| SEO y móvil | `app/layout.tsx`, `public/manifest.webmanifest`, `public/favicon.svg`, `public/brand/logo/*`, `public/brand/social/*` | Títulos, descripción, OG/Twitter, nombre instalado, iconos Apple/PWA, color del navegador |
| Recursos | `public/brand/incoming/*`, `public/brand/web/*`, `public/brand/services/*` | Originales preservados y derivados responsivos optimizados |
| Reserva y legal | `app/reservar/page.tsx`, `app/privacidad/page.tsx`, `app/not-found.tsx` | Marca y selección pública de servicios de Nurme, precios originales por servicio, 404 |
| Panel | `app/panel/acceso/page.tsx`, `app/panel/cambiar-clave/page.tsx`, `app/panel/recuperar-clave/page.tsx`, `app/panel/panel-client.tsx`, `app/panel/agenda-workspace.tsx` | Marca, responsabilidades, ayuda de acceso, salida móvil y comunicaciones |
| API y disponibilidad | `app/api/appointments/route.ts`, `app/api/appointments/[id]/route.ts`, `app/api/auth/login/route.ts`, `app/api/booking-requests/route.ts`, `app/api/schedule-blocks/route.ts`, `app/api/services/[id]/route.ts`, `lib/booking-availability.ts` | Mensajes MB Beauty, fecha de privacidad; sin cambios a roles o persistencia |
| Compilación | `package.json`, `package-lock.json`, `scripts/project-task.mjs`, `scripts/preview-server.mjs`, `eslint.config.mjs`, `lib/supabase.ts`, `worker/index.ts` | Comandos Windows/Linux, verificación de artefacto y dos errores previos de tipos corregidos |
| Cloudflare | `wrangler.mb-beauty.jsonc` | Candidata para Worker nuevo; `wrangler.jsonc` activo intacto |
| Calidad y entrega | `tests/rendered-html.test.mjs`, `tests/staff-workflows.test.mjs`, `README.md`, `docs/MB-BEAUTY-ENTREGA.md`, `docs/MB-BEAUTY-ACCESOS.md`, `docs/MB-BEAUTY-CLOUDFLARE.md` | Pruebas, auditoría, propuesta de permisos, publicación y rollback |

## Referencias antiguas que permanecen

1. `wrangler.jsonc`: nombre del Worker antiguo para proteger la web existente mientras se revisa la transición.
2. Remoto Git y nombre de carpeta: repositorio histórico; no se cambia infraestructura remota sin aprobación.
3. Supabase sigue llamándose **Kaizen** remotamente; `supabase/README.md` y comentarios de las cuatro migraciones conservan esa referencia histórica. No se modifica el proyecto ni el historial SQL.
4. Cookies `kaizen_access_token` y `kaizen_refresh_token` en `lib/staff-auth.ts`: conservar compatibilidad de sesiones. Las pruebas verifican esos identificadores y la ausencia de Kaizen en HTML visible.
5. Constante interna `KAIZEN_HOURS`: conserva el horario y las importaciones de disponibilidad; no es un texto visible.
6. `public/logo-kaizen.png` y fotografías antiguas de `public/services/`: conservadas y sin referencias en la interfaz nueva.
7. `sarai`/`yeroha` en catálogo, disponibilidad, CSS de calendario y nombres históricos del panel: necesarias para registros y servicios antiguos. Ya no aparecen como equipo público ni como opciones de reserva nuevas.
8. `.openai/hosting.json`: identificador histórico conservado. La tarea usa Cloudflare; no se publica en Sites.

## Pruebas y límites

| Comprobación | Resultado |
| --- | --- |
| `npm ci` | Instalación limpia correcta: 490 paquetes. Primer intento bloqueado por red del sandbox; segundo autorizado correcto |
| `npm run lint` | Correcto, sin errores ni advertencias tras el ajuste de archivos generados |
| `npm run typecheck` | Correcto |
| `npm test` | Build de producción y **31 pruebas correctas** |
| Artefacto | ESM `default.fetch`, manifest de hosting y recursos de cliente verificados |
| Rutas | Portada, reserva, privacidad, acceso, cambio de clave, ayuda, panel protegido y 404; recarga directa verificada |
| Seguridad local | Rechazo sin sesión y por origen ajeno; cookies y cierre de sesión; perfiles del servidor prevalecen sobre metadatos editables |
| Flujos simulados | Login/refresh, persistencia, agenda de Nurme, panel de Manuel, alta/edición, solapamientos, cita no visible por RLS y reserva con RPC existente |
| Navegador | Portada a 320/390/768/1280 px sin overflow; menú y Escape; reserva, acceso y agenda con datos sintéticos. Imágenes WebP cargadas correctamente |
| Supabase real | **Pendiente: proyecto INACTIVE**. Consulta de perfiles de lectura por timeout; Management confirmó el estado. Ningún cambio remoto |
| iPhone físico | Pendiente. Nombre Apple, icono 180 px, manifest y color preparados; no se afirma prueba en un dispositivo físico |

Las pruebas simuladas no demuestran las políticas RLS instaladas en producción ni el acceso de las cuentas reales. Hace falta reactivar el proyecto con autorización y realizar una aceptación con cuentas de prueba en un entorno separado. No se escribió ningún dato de prueba en producción. El preview Windows corrige el servicio local de archivos del build con separadores Windows; no cambia el Worker desplegado.

La nueva portada utiliza contrastes de texto carbón/taupe sobre fondos claros, foco visible y etiquetas HTML. Las pantallas internas se revisaron visualmente, pero hace falta una revisión final de accesibilidad de todos los modales con cuentas reales: no se afirma certificación WCAG de toda la aplicación.

## Información que Manuel y Nurme deben confirmar

- Dirección exacta en La Cuesta y vigencia del teléfono/WhatsApp 639 38 47 27. Se conserva la dirección registrada de Barranco Grande, marcada pendiente; los mensajes históricos conservan el domicilio, por lo que deben revisarse antes de enviar avisos reales.
- Horarios y precios actuales; se conservaron los horarios del sistema y los precios individuales del catálogo del repositorio. Se retiraron rangos resumidos potencialmente inexactos.
- Micropigmentación de cejas: está asociada a Sarai en el catálogo; no se anuncia como servicio de Nurme hasta confirmarlo. Dermaplaning no consta: no se añadió.
- Foto auténtica y biografía profesional autorizada de Nurme; certificaciones solo si se facilitan. Fotos de trabajos con consentimiento y testimonios verificables.
- Datos fiscales/legales completos de la titular para completar el aviso y, si procede, aviso legal. La privacidad conserva su estructura sin inventar NIF ni un email.
- Reactivación de Supabase, roles efectivos y matriz de permisos según el informe separado.
- Cuenta/subdominio Cloudflare, integración GitHub/Builds y URL definitiva. OG/Twitter ya preparan imágenes absolutas para la URL nueva; no serán recuperables públicamente hasta publicar el Worker. Canonical pendiente de confirmación del dominio.
- Recuperación de contraseña por correo: SMTP, URLs autorizadas y flujo seguro deberán aprobarse en una tarea de Auth separada.

## Preview y revisión

Preview final: `http://localhost:3004/`. Acceso: `/panel/acceso`. Las páginas `/__qa/panel` y `/__qa/admin` existen solo en el preview iniciado con `--qa` y muestran datos sintéticos; los snapshots están en `outputs/` y nunca en `dist/client`.

Para volver a abrirlo: `npm run start -- --port 3004 --qa`, después de `npm test`. Capturas en `outputs/mb-beauty-desktop.jpg` y `outputs/mb-beauty-mobile.jpg`.

No hay push, merge, deploy ni cambios de permisos. La aceptación operativa contra Supabase real sigue pendiente. Los informes de [accesos](MB-BEAUTY-ACCESOS.md) y [Cloudflare](MB-BEAUTY-CLOUDFLARE.md) describen la siguiente fase y su reversión.
