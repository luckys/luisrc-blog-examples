# Providers de Terraform: fijar versiones y saber qué valida cada herramienta

Artículo español en draft. Pregunta: Qué aporta el provider y qué garantizan las restricciones y el lockfile.

Fuentes completas y pruebas:

- [terraform/versions.tf](../../../packages/declarative-infrastructure/terraform/versions.tf)
- [terraform/.terraform.lock.hcl](../../../packages/declarative-infrastructure/terraform/.terraform.lock.hcl)
- [tools.json](../../../packages/declarative-infrastructure/tools.json)
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
