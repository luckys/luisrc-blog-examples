# IaaS, PaaS y serverless: qué trabajo delegas y qué sigue siendo tuyo

Artículo español en draft. Pregunta: Cómo elegir un nivel de gestión sin confundir cloud con ausencia de operación.

Fuentes completas y pruebas:

- [designs/lambda.json](../../../packages/aws-foundations/designs/lambda.json)
- [designs/ecs.json](../../../packages/aws-foundations/designs/ecs.json)
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
