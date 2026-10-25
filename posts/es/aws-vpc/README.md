# VPC, subnets y endpoints: dibujar por dónde puede salir una petición

Artículo español en draft. Pregunta: Qué hacen rutas, direcciones, security groups y endpoints en una API privada.

Fuentes completas y pruebas:

- [designs/ecs.json](../../../packages/aws-foundations/designs/ecs.json)
- [src/contracts.ts](../../../packages/aws-foundations/src/contracts.ts)
- [pricing/prices-us-east-1.json](../../../packages/aws-foundations/pricing/prices-us-east-1.json)
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
