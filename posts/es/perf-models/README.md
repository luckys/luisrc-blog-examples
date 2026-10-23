# Open-loop y closed-loop con k6: quién decide cuándo llega la siguiente petición

Artículo español en draft. Pregunta: Cómo distinguir presión externa de clientes que esperan y de un generador sin VUs libres.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/performance-lab/k6/load.js](../../../packages/performance-lab/k6/load.js)
- [packages/performance-lab/scripts/measure-load.mjs](../../../packages/performance-lab/scripts/measure-load.mjs)
- [packages/performance-lab/scripts/install-k6.mjs](../../../packages/performance-lab/scripts/install-k6.mjs)
- [packages/performance-lab/evidence/load.json](../../../packages/performance-lab/evidence/load.json)
- [packages/performance-lab/README.md](../../../packages/performance-lab/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/performance-lab test
pnpm --dir packages/performance-lab verify
pnpm --dir packages/performance-lab typecheck
```

Ver límites en el README del paquete: HTTP loopback, k6 y perfiles de procesos locales.
Sin cloud, SQL, soak de horas o CPU aislada. Ver README para regenerar mediciones.
