# Módulos de Terraform: agrupar una decisión con variables y outputs claros

Artículo español en draft. Pregunta: Cómo separar un módulo útil sin construir una plataforma genérica.

Fuentes completas y pruebas:

- [terraform/main.tf](../../../packages/declarative-infrastructure/terraform/main.tf)
- [terraform/modules/catalogue/variables.tf](../../../packages/declarative-infrastructure/terraform/modules/catalogue/variables.tf)
- [terraform/modules/catalogue/main.tf](../../../packages/declarative-infrastructure/terraform/modules/catalogue/main.tf)
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
