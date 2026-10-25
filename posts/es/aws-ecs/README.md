# ECS con Fargate: gestionar tasks sin administrar los hosts

Artículo español en draft. Pregunta: Cómo distinguir task definition, task, service y responsabilidades de una image.

Fuentes completas y pruebas:

- [designs/task-fragment.json](../../../packages/aws-foundations/designs/task-fragment.json)
- [designs/ecs.json](../../../packages/aws-foundations/designs/ecs.json)
- [src/costs.ts](../../../packages/aws-foundations/src/costs.ts)
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
