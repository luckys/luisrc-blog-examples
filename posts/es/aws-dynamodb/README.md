# DynamoDB: empezar por las consultas antes de elegir las claves

Artículo español en draft. Pregunta: Cómo decidir key, lectura y coste sin trasladar automáticamente un modelo relacional.

Fuentes completas y pruebas:

- [src/contracts.ts](../../../packages/aws-foundations/src/contracts.ts)
- [src/catalogue.ts](../../../packages/aws-foundations/src/catalogue.ts)
- [designs/lambda.json](../../../packages/aws-foundations/designs/lambda.json)
- [tests/contracts.test.mjs](../../../packages/aws-foundations/tests/contracts.test.mjs)
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
