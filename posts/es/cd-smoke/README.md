# Smoke tests: detectar una release incorrecta aunque responda 200

Artículo español en draft. Pregunta: Cómo comprobar un contrato de negocio pequeño en el artefacto desplegado.

Fuentes completas y pruebas del artículo:

- [src/gates.ts](../../../packages/progressive-delivery/src/gates.ts)
- [scripts/smoke.mjs](../../../packages/progressive-delivery/scripts/smoke.mjs)
- [scripts/exercise.mjs](../../../packages/progressive-delivery/scripts/exercise.mjs)
- [tests/core.test.mjs](../../../packages/progressive-delivery/tests/core.test.mjs)
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
