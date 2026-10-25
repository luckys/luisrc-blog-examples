# Acciones de un postmortem: cerrar una mejora con pruebas, no con una tarea marcada

Artículo español en draft. Pregunta: Cómo relacionar corrección, responsable y evidencia sin declarar cerradas garantías no probadas.

Extractos explicados en el post, laboratorio completo aquí:

- [docs/actions.json](../../../packages/incident-response/docs/actions.json)
- [src/config.ts](../../../packages/incident-response/src/config.ts)
- [src/review.ts](../../../packages/incident-response/src/review.ts)
- [tests/config.test.mjs](../../../packages/incident-response/tests/config.test.mjs)
- [tests/review.test.mjs](../../../packages/incident-response/tests/review.test.mjs)
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
