# Saturación y stress testing: medir trabajo útil y comprobar la recuperación

Artículo español en draft. Pregunta: Qué significa saturación cuando el servicio rechaza trabajo sin tener la CPU llena.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/performance-lab/src/server.ts](../../../packages/performance-lab/src/server.ts)
- [packages/performance-lab/scripts/measure-load.mjs](../../../packages/performance-lab/scripts/measure-load.mjs)
- [packages/performance-lab/tests/http.test.mjs](../../../packages/performance-lab/tests/http.test.mjs)
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
