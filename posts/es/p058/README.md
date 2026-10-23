# Latencia y percentiles: qué mide el p99 y qué puede esconder

Artículo español en draft. Pregunta: Cómo interpretar distribuciones sin mezclar éxito, error y agregaciones incompatibles.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/performance-lab/src/statistics.ts](../../../packages/performance-lab/src/statistics.ts)
- [packages/performance-lab/tests/core.test.mjs](../../../packages/performance-lab/tests/core.test.mjs)
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
