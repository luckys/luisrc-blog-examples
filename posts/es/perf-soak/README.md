# Soak testing: mirar el paso del tiempo, no solo el resultado final

Artículo español en draft. Pregunta: Qué aporta una serie temporal y por qué sesenta segundos no prueban estabilidad durante horas.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/performance-lab/src/windows.ts](../../../packages/performance-lab/src/windows.ts)
- [packages/performance-lab/tests/profiles.test.mjs](../../../packages/performance-lab/tests/profiles.test.mjs)
- [packages/performance-lab/scripts/measure-load.mjs](../../../packages/performance-lab/scripts/measure-load.mjs)
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
