# Burn rate: cuánto más rápido se consume el presupuesto y cuándo importa el tráfico

Artículo español en draft. Pregunta: Qué mide un ratio de consumo y qué supuestos exige convertirlo en tiempo.

Extractos explicados en el post, laboratorio completo aquí:

- [src/budget.ts](../../../packages/service-objectives/src/budget.ts)
- [src/simulation.ts](../../../packages/service-objectives/src/simulation.ts)
- [tests/budget.test.mjs](../../../packages/service-objectives/tests/budget.test.mjs)
- [scripts/simulate.mjs](../../../packages/service-objectives/scripts/simulate.mjs)
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
