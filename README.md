# MB Nurme Beauty

Plataforma de estética y cuidado personalizado de Nurme Martín en Tenerife.
Web pública y panel privado para reservas, agenda, clientas, historial, tratamientos, fotografías, cobros y avisos de WhatsApp.

## Desarrollo local

Node.js >=22.13.0. React 19, Next.js/Vinext, Vite y Cloudflare Workers. Supabase conserva Auth, PostgreSQL y Storage existentes.

```bash
npm ci
npm run dev
```

Para revisar el build en Windows:

```bash
npm run build
npm run start -- --port 3003
```

Los comandos de build/lint funcionan en Windows y conservan los verificadores Bash del entorno Linux. El preview de Windows sirve el Worker compilado y sus recursos estáticos; no publica nada. Supabase debe estar activo para operaciones reales.

## Comprobaciones

```bash
npm run lint
npm run typecheck
npm test
npm run validate:artifact
```

Las pruebas de flujos autenticados interceptan Supabase con datos sintéticos y no escriben en el proyecto remoto. Sus snapshots se guardan en `outputs/`, fuera del artefacto de despliegue.

## Revisión antes de publicar

- [Entrega y auditoría](docs/MB-BEAUTY-ENTREGA.md)
- [Informe de permisos pendiente de aprobación](docs/MB-BEAUTY-ACCESOS.md)
- [Transición Cloudflare y rollback](docs/MB-BEAUTY-CLOUDFLARE.md)

La web oficial usa el Worker `mb-beauty` con `wrangler.jsonc` y el proyecto Supabase activo `gwndpaeebjtoowuzkywz`. La marca visible es MB Nurme Beauty; se conserva la URL existente para mantener los enlaces y el QR. Los cambios se publican tras la autorización de Manuel y la validación correspondiente.

Las claves publicables existentes no se modifican. No incorporar claves secretas ni credenciales a código, commits o logs. Las migraciones y los datos históricos permanecen intactos.
