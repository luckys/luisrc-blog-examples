# Una API en Lambda o ECS: comparar costes sin inventar rendimiento

Artículo español en draft. Pregunta: Cómo comparar los dos diseños, sus partidas y sus tareas operativas con supuestos verificables.

Fuentes completas y pruebas:

- [src/costs.ts](../../../packages/aws-foundations/src/costs.ts)
- [scripts/pricing.mjs](../../../packages/aws-foundations/scripts/pricing.mjs)
- [pricing/catalogue-excerpts.json](../../../packages/aws-foundations/pricing/catalogue-excerpts.json)
- [pricing/prices-us-east-1.json](../../../packages/aws-foundations/pricing/prices-us-east-1.json)
- [scenarios.json](../../../packages/aws-foundations/scenarios.json)
- [evidence/comparison.json](../../../packages/aws-foundations/evidence/comparison.json)
- [README.md](../../../packages/aws-foundations/README.md)

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/aws-foundations test
pnpm --dir packages/aws-foundations exercise
pnpm --dir packages/aws-foundations verify
```

Contratos HTTP locales y costes calculados con tarifas públicas archivadas.
No despliega AWS ni prueba sus permisos, rendimiento, SQS o restauraciones RDS.
