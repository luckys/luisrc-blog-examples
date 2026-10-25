# Volúmenes en Docker: qué sobrevive a recrear un container

Artículo español en draft. Pregunta: Cómo distinguir persistencia, inicialización y un setup realmente vacío.

Código completo y pruebas del artículo:

- [compose.yaml](../../../packages/container-environments/compose.yaml)
- [sql/01-schema.sql](../../../packages/container-environments/sql/01-schema.sql)
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
