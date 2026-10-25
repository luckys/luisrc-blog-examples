# Triage de incidentes: separar el síntoma, la hipótesis y lo que sabemos

Artículo español en draft. Pregunta: Cómo delimitar impacto e investigar un sistema vivo que no completa trabajo.

Extractos explicados en el post, laboratorio completo aquí:

- [src/config.ts](../../../packages/incident-response/src/config.ts)
- [src/worker.ts](../../../packages/incident-response/src/worker.ts)
- [scripts/exercise.mjs](../../../packages/incident-response/scripts/exercise.mjs)
- [tests/http.test.mjs](../../../packages/incident-response/tests/http.test.mjs)
- [evidence/incident.json](../../../packages/incident-response/evidence/incident.json)
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
