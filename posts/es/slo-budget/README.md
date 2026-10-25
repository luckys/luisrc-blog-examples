# Error budgets: calcular el margen de fallo y acordar qué hacer cuando se agota

Artículo español en draft. Pregunta: Cómo convertir un objetivo en presupuesto sin esconder deuda ni cambiar el denominador.

Extractos explicados en el post, laboratorio completo aquí:

- [src/budget.ts](../../../packages/service-objectives/src/budget.ts)
- [tests/budget.test.mjs](../../../packages/service-objectives/tests/budget.test.mjs)
- [spec/budget-policy.json](../../../packages/service-objectives/spec/budget-policy.json)
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
