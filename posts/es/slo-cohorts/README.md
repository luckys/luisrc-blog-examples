# SLI asíncronos: esperar a que una operación pueda incumplir su plazo

Artículo español en draft. Pregunta: Cómo medir resolución sin favorecer éxitos rápidos y excluir pendientes recientes.

Extractos explicados en el post, laboratorio completo aquí:

- [src/cohorts.ts](../../../packages/service-objectives/src/cohorts.ts)
- [src/fixtures.ts](../../../packages/service-objectives/src/fixtures.ts)
- [tests/sli.test.mjs](../../../packages/service-objectives/tests/sli.test.mjs)
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
