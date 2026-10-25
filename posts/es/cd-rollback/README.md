# Rollback de aplicación y esquema: volver a una versión que todavía entiende los datos

Artículo español en draft. Pregunta: Cómo comprobar vuelta de image, lecturas y escrituras mientras se conserva el esquema expandido.

Fuentes completas y pruebas del artículo:

- [sql/02-expand.sql](../../../packages/progressive-delivery/sql/02-expand.sql)
- [sql/03-unsafe-contract.sql](../../../packages/progressive-delivery/sql/03-unsafe-contract.sql)
- [src/server.ts](../../../packages/progressive-delivery/src/server.ts)
- [scripts/exercise.mjs](../../../packages/progressive-delivery/scripts/exercise.mjs)
- [evidence/delivery.json](../../../packages/progressive-delivery/evidence/delivery.json)
- [README.md](../../../packages/progressive-delivery/README.md)

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/progressive-delivery run test
pnpm --filter @luisrc-examples/progressive-delivery run typecheck
pnpm --filter @luisrc-examples/progressive-delivery run exercise
pnpm --filter @luisrc-examples/progressive-delivery run verify
```

El exercise ejecuta pipeline local, audit runtime y containers reales. Prueba un
candidato defectuoso deliberado, routing, flags y rollback con esquema compatible.
No activa GitHub Actions, despliegues remotos o tráfico de producción. Ver README.
