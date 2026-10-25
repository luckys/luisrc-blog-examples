# Secrets y RBAC: codificar un valor no decide quién puede leerlo

Artículo español en draft. Pregunta: Cómo separar Secret, identidad de workload y autorización del API.

Fuentes completas y pruebas:

- [manifests/secret.json](../../../packages/kubernetes-workloads/manifests/secret.json)
- [manifests/service-account.json](../../../packages/kubernetes-workloads/manifests/service-account.json)
- [manifests/reader-role.json](../../../packages/kubernetes-workloads/manifests/reader-role.json)
- [manifests/reader-binding.json](../../../packages/kubernetes-workloads/manifests/reader-binding.json)
- [README.md](../../../packages/kubernetes-workloads/README.md)

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --dir packages/kubernetes-workloads test
pnpm --dir packages/kubernetes-workloads exercise
pnpm --dir packages/kubernetes-workloads verify
```

Kubernetes real local, requiere Docker con K3s privilegiado. Solo fixtures públicas;
sin kubeconfig personal o cloud. Ver README para limpieza y límites.
