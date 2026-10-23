# CPU profiling en Node.js: encontrar trabajo costoso sin confundir muestras con cronómetros

Artículo español en draft. Pregunta: Qué muestra un perfil de CPU y cómo contrastarlo con tiempo de pared y CPU consumida.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/performance-lab/scripts/cpu-child.mjs](../../../packages/performance-lab/scripts/cpu-child.mjs)
- [packages/performance-lab/src/workload.ts](../../../packages/performance-lab/src/workload.ts)
- [packages/performance-lab/evidence/profiles.json](../../../packages/performance-lab/evidence/profiles.json)
- [packages/performance-lab/evidence/profiles/slow.cpuprofile](../../../packages/performance-lab/evidence/profiles/slow.cpuprofile)
- [packages/performance-lab/evidence/profiles/indexed.cpuprofile](../../../packages/performance-lab/evidence/profiles/indexed.cpuprofile)
- [packages/performance-lab/evidence/profiles/slow-no-inlining.cpuprofile](../../../packages/performance-lab/evidence/profiles/slow-no-inlining.cpuprofile)
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
