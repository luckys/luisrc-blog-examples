# Rolling deployments: convivir con dos versiones sin perder compatibilidad

Artículo español en draft. Pregunta: Cómo reemplazar instancias por pasos y comprobar las versiones que conviven.

Fuentes completas y pruebas del artículo:

- [compose.yaml](../../../packages/progressive-delivery/compose.yaml)
- [src/router.ts](../../../packages/progressive-delivery/src/router.ts)
- [scripts/exercise.mjs](../../../packages/progressive-delivery/scripts/exercise.mjs)
- [sql/02-expand.sql](../../../packages/progressive-delivery/sql/02-expand.sql)
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
