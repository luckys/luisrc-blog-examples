# Alertas multi-window: detectar consumo peligroso sin seguir avisando de un fallo recuperado

Artículo español en draft. Pregunta: Cómo combinar ventanas, volumen, cobertura y acciones en una condición de alerta verificable.

Extractos explicados en el post, laboratorio completo aquí:

- [src/alerts.ts](../../../packages/service-objectives/src/alerts.ts)
- [src/simulation.ts](../../../packages/service-objectives/src/simulation.ts)
- [tests/alerts.test.mjs](../../../packages/service-objectives/tests/alerts.test.mjs)
- [spec/alert-runbook.md](../../../packages/service-objectives/spec/alert-runbook.md)
- [explorer.html](../../../packages/service-objectives/explorer.html)
- [explorer.mjs](../../../packages/service-objectives/explorer.mjs)
- [evidence/simulation.json](../../../packages/service-objectives/evidence/simulation.json)
- [README.md](../../../packages/service-objectives/README.md)

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/service-objectives test
pnpm --filter @luisrc-examples/service-objectives verify
```

Datos simulados, no tráfico real. Ver README para límites: sin endpoint desplegado,
Prometheus, notificaciones, calendario civil o política aplicada automáticamente.
