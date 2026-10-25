# Postmortems sin culpables: reconstruir causas y decisiones sin reescribir el pasado

Artículo español en draft. Pregunta: Cómo separar hechos capturados, explicación causal y límites de un incidente sintético.

Extractos explicados en el post, laboratorio completo aquí:

- [scripts/exercise.mjs](../../../packages/incident-response/scripts/exercise.mjs)
- [scripts/verify.mjs](../../../packages/incident-response/scripts/verify.mjs)
- [evidence/postmortem.md](../../../packages/incident-response/evidence/postmortem.md)
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
