# IAM: dar permisos a un servicio sin repartir claves permanentes

Artículo español en draft. Pregunta: Cómo separar quién asume un role, qué puede hacer y con qué recursos.

Fuentes completas y pruebas:

- [src/contracts.ts](../../../packages/aws-foundations/src/contracts.ts)
- [tests/contracts.test.mjs](../../../packages/aws-foundations/tests/contracts.test.mjs)
- [designs/task-fragment.json](../../../packages/aws-foundations/designs/task-fragment.json)
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
