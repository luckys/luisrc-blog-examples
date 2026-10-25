# Feature flags: separar el deploy del comportamiento que reciben los usuarios

Artículo español en draft. Pregunta: Cómo activar y retirar comportamiento sin reconstruir la image y sin usar una flag como autorización.

Fuentes completas y pruebas del artículo:

- [src/product.ts](../../../packages/progressive-delivery/src/product.ts)
- [src/router.ts](../../../packages/progressive-delivery/src/router.ts)
- [src/rollout.ts](../../../packages/progressive-delivery/src/rollout.ts)
- [tests/core.test.mjs](../../../packages/progressive-delivery/tests/core.test.mjs)
- [tests/router.test.mjs](../../../packages/progressive-delivery/tests/router.test.mjs)
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
