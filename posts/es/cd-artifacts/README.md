# Artefactos inmutables: desplegar lo que probaste y conservar una vuelta atrás

Artículo español en draft. Pregunta: Cómo identificar las images ejecutadas y promover el mismo contenido entre etapas.

Fuentes completas y pruebas del artículo:

- [Dockerfile](../../../packages/progressive-delivery/Dockerfile)
- [variants/stable.json](../../../packages/progressive-delivery/variants/stable.json)
- [variants/candidate.json](../../../packages/progressive-delivery/variants/candidate.json)
- [scripts/pipeline.mjs](../../../packages/progressive-delivery/scripts/pipeline.mjs)
- [scripts/exercise.mjs](../../../packages/progressive-delivery/scripts/exercise.mjs)
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
