# RDS: gestionar PostgreSQL sin delegar el diseño ni la recuperación

Artículo español en draft. Pregunta: Qué aporta una base gestionada y qué evidencia sigue faltando para operar y restaurar.

Fuentes completas y pruebas:

- [designs/rds-plan.json](../../../packages/aws-foundations/designs/rds-plan.json)
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
