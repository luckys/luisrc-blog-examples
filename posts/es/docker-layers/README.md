# Dockerfile y build cache: cambiar código sin reinstalar dependencias

Artículo español en draft. Pregunta: Cómo ordenar las entradas de un build y observar la reutilización de cache.

Código completo y pruebas del artículo:

- [Dockerfile](../../../packages/container-environments/Dockerfile)
- [Dockerfile.dockerignore](../../../packages/container-environments/Dockerfile.dockerignore)
- [package.json](../../../packages/container-environments/package.json)
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
