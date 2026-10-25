# Terraform state: relacionar recursos, coordinar cambios y proteger datos sensibles

Artículo español en draft. Pregunta: Por qué el state no es un backup ni un archivo para guardar en Git.

Fuentes completas y pruebas:

- [terraform/versions.tf](../../../packages/declarative-infrastructure/terraform/versions.tf)
- [terraform/modules/catalogue/main.tf](../../../packages/declarative-infrastructure/terraform/modules/catalogue/main.tf)
- [scripts/exercise.mjs](../../../packages/declarative-infrastructure/scripts/exercise.mjs)
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
