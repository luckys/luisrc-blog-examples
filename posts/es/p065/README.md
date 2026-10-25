# Terraform: describir infraestructura, revisar el plan y comprobar el resultado

Artículo español en draft. Pregunta: Cómo separar configuración, plan, state y comportamiento observado.

Fuentes completas y pruebas:

- [terraform/main.tf](../../../packages/declarative-infrastructure/terraform/main.tf)
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
