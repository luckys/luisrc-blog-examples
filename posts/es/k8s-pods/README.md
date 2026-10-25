# Kubernetes: qué es un Pod y quién mantiene la aplicación ejecutándose

Artículo español en draft. Pregunta: Cómo separar API, scheduler, kubelet y controladores al observar un Pod.

Fuentes completas y pruebas:

- [manifests/deployment.json](../../../packages/kubernetes-workloads/manifests/deployment.json)
- [scripts/exercise.mjs](../../../packages/kubernetes-workloads/scripts/exercise.mjs)
- [evidence/kubernetes.json](../../../packages/kubernetes-workloads/evidence/kubernetes.json)
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
