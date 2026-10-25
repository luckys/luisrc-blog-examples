# Planes guardados y reemplazos: aplicar el cambio revisado sin prometer un rollback automático

Artículo español en draft. Pregunta: Cómo revisar reemplazos, rechazar planes obsoletos y recuperar después de un fallo.

Fuentes completas y pruebas:

- [terraform/modules/catalogue/main.tf](../../../packages/declarative-infrastructure/terraform/modules/catalogue/main.tf)
- [scripts/plan.mjs](../../../packages/declarative-infrastructure/scripts/plan.mjs)
- [scripts/exercise.mjs](../../../packages/declarative-infrastructure/scripts/exercise.mjs)
- [evidence/terraform.json](../../../packages/declarative-infrastructure/evidence/terraform.json)
- [README.md](../../../packages/declarative-infrastructure/README.md)

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --dir packages/declarative-infrastructure test
pnpm --dir packages/declarative-infrastructure exercise
pnpm --dir packages/declarative-infrastructure verify
```

Terraform y Kubernetes locales reales. Requiere Docker para K3s privilegiado.
Sin nube, kubeconfig personal o secretos reales. Ver README para límites y limpieza.
