# S3: guardar objetos y controlar su acceso sin tratarlo como un disco

Artículo español en draft. Pregunta: Cómo diseñar keys, permisos y acceso temporal para objetos.

Fuentes completas y pruebas:

- [src/contracts.ts](../../../packages/aws-foundations/src/contracts.ts)
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
