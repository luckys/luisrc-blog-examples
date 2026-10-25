# AWS foundations — en preparación

Laboratorio inicial de P064. Los once artículos previstos, sus diagramas y el
comparador visual están pendientes. Este paquete conserva el trabajo implementado
sin presentar la serie como terminada.

## Ejecutar desde la raíz del monorepo

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/aws-foundations test
pnpm --dir packages/aws-foundations typecheck
pnpm --dir packages/aws-foundations exercise
pnpm --dir packages/aws-foundations verify
```

`exercise` compila el modelo, compara dos diseños declarados y prueba cuatro
respuestas mediante HTTP loopback y un adaptador Lambda invocado localmente.
`verify` contrasta hashes, tarifas y resultados archivados sin consultar AWS.
El reader es ficticio: no hay llamadas a DynamoDB ni despliegue cloud.

Las tarifas archivadas proceden de cinco catálogos públicos de AWS Price List:
us-east-1, USD, on-demand y los tramos identificados en `pricing/`.
Para recapturarlas explícitamente, con acceso a internet:

```bash
pnpm --dir packages/aws-foundations run prices:refresh
pnpm --dir packages/aws-foundations exercise
```

No requiere credenciales de AWS ni crea recursos facturables. Los identificadores
y el digest de `designs/task-fragment.json` son ficticios; no es una plantilla
desplegable.

## Alcance

- Diseños HTTP API/Lambda Event Functions on-demand y ALB/ECS Fargate privado
  en dos AZ, ambos con DynamoDB propuesto.
- Subtotales de infraestructura con supuestos explícitos. Excluyen DB, logs,
  transferencias, impuestos, descuentos y horas de ingeniería. No son una factura
  completa ni demuestran capacidad o latencia equivalentes.
- Contratos locales de permisos, keys, red, batches Standard y planes de DB.
  No evalúan IAM real ni verifican entregas SQS, escrituras S3 o restores RDS.
- Modelo puro en `src/costs.ts`; `cost-model.mjs` es su exportación compilada,
  destinada al futuro comparador estático.

Consultar `evidence/comparison.json` para la captura y sus límites. La selección
de tarifas y sus hashes permiten comprobar consistencia; no constituyen una
attestation firmada por AWS.
