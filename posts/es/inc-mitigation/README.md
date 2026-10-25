# Mitigar un incidente: reducir el daño y comprobar la recuperación del usuario

Artículo español en draft. Pregunta: Cómo contener, restaurar y verificar sin borrar trabajo ni confundir un ACK con recuperación.

Extractos explicados en el post, laboratorio completo aquí:

- [src/server.ts](../../../packages/incident-response/src/server.ts)
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
