# EC2: ejecutar una aplicación también significa operar su máquina

Artículo español en draft. Pregunta: Qué decisiones asumes al elegir una máquina virtual y cómo separar proceso, disco y capacidad.

Fuentes completas y pruebas:

- [src/http.ts](../../../packages/aws-foundations/src/http.ts)
- [src/catalogue.ts](../../../packages/aws-foundations/src/catalogue.ts)
- [tests/adapters.test.mjs](../../../packages/aws-foundations/tests/adapters.test.mjs)
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
