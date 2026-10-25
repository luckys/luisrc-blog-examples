# CI/CD: qué demuestra un pipeline y cuándo debe detener una entrega

Artículo español en draft. Pregunta: Cómo conectar build, tests y controles de seguridad sin confundir checks verdes con permiso para liberar.

Fuentes completas y pruebas del artículo:

- [scripts/pipeline.mjs](../../../packages/progressive-delivery/scripts/pipeline.mjs)
- [src/gates.ts](../../../packages/progressive-delivery/src/gates.ts)
- [tests/core.test.mjs](../../../packages/progressive-delivery/tests/core.test.mjs)
- [Dockerfile](../../../packages/progressive-delivery/Dockerfile)
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
