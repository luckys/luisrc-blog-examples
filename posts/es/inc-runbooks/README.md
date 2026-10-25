# Runbooks: convertir una receta de comandos en decisiones con límites

Artículo español en draft. Pregunta: Cómo probar un procedimiento con scope, revisión esperada, salidas y condiciones de parada.

Extractos explicados en el post, laboratorio completo aquí:

- [docs/runbook.md](../../../packages/incident-response/docs/runbook.md)
- [src/config.ts](../../../packages/incident-response/src/config.ts)
- [scripts/fixture.mjs](../../../packages/incident-response/scripts/fixture.mjs)
- [scripts/exercise.mjs](../../../packages/incident-response/scripts/exercise.mjs)
- [tests/config.test.mjs](../../../packages/incident-response/tests/config.test.mjs)
- [README.md](../../../packages/incident-response/README.md)

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/incident-response test
pnpm --filter @luisrc-examples/incident-response verify
```

HTTP y procesos locales reales; incidente sintético, no usuarios de producción.
Ver README para ejecutar una nueva captura y conocer los límites: cola volátil,
sin guardia humana, alertas desplegadas, crash recovery o deployment de artefactos.
