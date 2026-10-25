# Blue-green deployments: cambiar tráfico sin olvidar la base de datos

Artículo español en draft. Pregunta: Qué cambia al preparar otro grupo y conmutar tráfico cuando ambos comparten SQL.

Fuentes completas y pruebas del artículo:

- [compose.yaml](../../../packages/progressive-delivery/compose.yaml)
- [src/rollout.ts](../../../packages/progressive-delivery/src/rollout.ts)
- [src/router.ts](../../../packages/progressive-delivery/src/router.ts)
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
