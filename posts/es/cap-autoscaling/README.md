# Autoscaling y colas: qué ocurre mientras llegan las nuevas réplicas

Draft español. Pregunta: Cómo explorar preparación, cola limitada y capacidad global en una traza explícitamente simulada.

- [src/model.ts](../../../packages/capacity-costs/src/model.ts)
- [tests/model.test.mjs](../../../packages/capacity-costs/tests/model.test.mjs)
- [scenarios.json](../../../packages/capacity-costs/scenarios.json)
- [scripts/calculate.mjs](../../../packages/capacity-costs/scripts/calculate.mjs)
- [evidence/calculations.json](../../../packages/capacity-costs/evidence/calculations.json)
- [README.md](../../../packages/capacity-costs/README.md)

Desde la raíz del monorepo:

```bash
pnpm --dir packages/capacity-costs test
pnpm --dir packages/capacity-costs exercise
pnpm --dir packages/capacity-costs verify
pnpm --dir packages/capacity-costs render
```

Tarifas e inputs ficticios. Cálculos y simulación fluida, sin cloud, factura o benchmark.
