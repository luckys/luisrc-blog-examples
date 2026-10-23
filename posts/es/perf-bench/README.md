# Microbenchmarks: comparar dos implementaciones sin cambiar el problema

Artículo español en draft. Pregunta: Cómo fijar dataset, calentamiento, orden y resultado antes de comparar tiempos.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/performance-lab/src/workload.ts](../../../packages/performance-lab/src/workload.ts)
- [packages/performance-lab/scripts/benchmark-child.mjs](../../../packages/performance-lab/scripts/benchmark-child.mjs)
- [packages/performance-lab/evidence/profiles.json](../../../packages/performance-lab/evidence/profiles.json)
- [packages/performance-lab/tests/core.test.mjs](../../../packages/performance-lab/tests/core.test.mjs)
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
