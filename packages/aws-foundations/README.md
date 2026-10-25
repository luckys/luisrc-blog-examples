# AWS foundations: servicios, contratos y costes declarados

Laboratorio compartido por once drafts españoles de P064. Incluye contratos
locales, tarifas archivadas, dos diseños, gráfico derivado y comparador estático.
No es un despliegue AWS ni un emulador de sus servicios.

## Ejecutar desde la raíz del monorepo

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/aws-foundations test
pnpm --dir packages/aws-foundations typecheck
pnpm --dir packages/aws-foundations exercise
pnpm --dir packages/aws-foundations verify
(cd packages/aws-foundations && node render-results.mjs)
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
  compartida con el comparador estático.

Consultar `evidence/comparison.json` para la captura y sus límites. La selección
de tarifas y sus hashes permiten comprobar consistencia; no constituyen una
attestation firmada por AWS.

## Gráfico y comparador

`render-results.mjs` deriva `cost-summary.svg` de `comparison.json`. El visor
`explorer.html/mjs` importa `cost-model.mjs` y carga solo el informe estático.
Los campos editables cambian supuestos, no tareas o recursos de AWS. No hay un
recálculo de capacidad, LCU o GB de red al modificar el tráfico.

Después de cambiar fuentes o tarifas, repetir exercise, verify y el render con node.
Desde la raíz, `BLOG_ROOT=/ruta/al/blog pnpm blog:sync` sincroniza únicamente la
allowlist pública; la evidencia completa con hashes permanece aquí. No modificar
las copias del blog como si fueran las fuentes canónicas.
