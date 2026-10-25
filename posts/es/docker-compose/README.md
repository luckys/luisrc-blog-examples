# Redes y readiness en Docker Compose: por qué localhost apunta al lugar equivocado

Artículo español en draft. Pregunta: Cómo conectar API, PostgreSQL y Redis y responder a caídas posteriores al arranque.

Código completo y pruebas del artículo:

- [compose.yaml](../../../packages/container-environments/compose.yaml)
- [src/server.ts](../../../packages/container-environments/src/server.ts)
- [src/notes.ts](../../../packages/container-environments/src/notes.ts)
- [scripts/exercise.mjs](../../../packages/container-environments/scripts/exercise.mjs)
- [evidence/compose.json](../../../packages/container-environments/evidence/compose.json)
- [README.md](../../../packages/container-environments/README.md)

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/container-environments test
pnpm --filter @luisrc-examples/container-environments typecheck
pnpm --filter @luisrc-examples/container-environments exercise
pnpm --filter @luisrc-examples/container-environments verify
```

El exercise ejecuta Docker real con un proyecto aleatorio y elimina sus containers,
redes y volúmenes. Conserva images locales. Ver README para setup manual, captura,
cache y límites de persistencia/seguridad; no es un despliegue de producción.
