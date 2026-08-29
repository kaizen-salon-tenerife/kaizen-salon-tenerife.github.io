# Kaizen Salón Tenerife

Web pública de Kaizen y panel privado para gestionar reservas, agenda,
clientas, fichas de tratamiento, fotografías, cobros y avisos de WhatsApp.

## Tecnología

- Next.js/Vinext y React.
- Supabase Auth para las cuentas internas.
- PostgreSQL de Supabase para los datos.
- Supabase Storage para fotografías privadas.
- Cloudflare como entorno de ejecución de la web.

## Preparación local

Requiere Node.js `>=22.13.0`.

```bash
npm ci
npm run dev
```

La URL y la clave pública de Supabase están en `lib/supabase.ts`. La clave
publicable está diseñada para usarse en aplicaciones web; la seguridad real la
aplican las políticas RLS incluidas en las migraciones.

## Base de datos

Las migraciones están en `supabase/migrations/` y deben ejecutarse en el orden
indicado en `supabase/README.md`. El repositorio no contiene contraseñas, claves
secretas ni la clave `service_role`.

## Comprobaciones

```bash
npm run lint
npm run build
npm test
```

`npm run build` también valida que el artefacto final incluya un Worker ESM
compatible con Cloudflare.
