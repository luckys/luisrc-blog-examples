# On-call y coordinación: quién decide, quién actúa y qué necesita un relevo

Artículo español en draft. Pregunta: Cómo organizar respuesta y comunicación sin confundir una plantilla con una guardia real.

Extractos explicados en el post, laboratorio completo aquí:

- [docs/coordination.json](../../../packages/incident-response/docs/coordination.json)
- [src/review.ts](../../../packages/incident-response/src/review.ts)
- [tests/review.test.mjs](../../../packages/incident-response/tests/review.test.mjs)
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
