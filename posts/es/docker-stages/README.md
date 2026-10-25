# Multi-stage builds: compilar TypeScript y entregar solo lo necesario

Artículo español en draft. Pregunta: Cómo separar compilación y ejecución sin romper dependencias del monorepo.

Código completo y pruebas del artículo:

- [Dockerfile](../../../packages/container-environments/Dockerfile)
- [package.json](../../../packages/container-environments/package.json)
- [tsconfig.json](../../../packages/container-environments/tsconfig.json)
- [src/notes.ts](../../../packages/container-environments/src/notes.ts)
- [tests/notes.test.mjs](../../../packages/container-environments/tests/notes.test.mjs)
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
