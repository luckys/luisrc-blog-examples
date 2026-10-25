# Deployment y ReplicaSet: cambiar de versión y recuperar la anterior

Artículo español en draft. Pregunta: Qué mantiene un Deployment y qué demuestra realmente un rollout.

Fuentes completas y pruebas:

- [manifests/deployment.json](../../../packages/kubernetes-workloads/manifests/deployment.json)
- [Dockerfile](../../../packages/kubernetes-workloads/Dockerfile)
- [scripts/exercise.mjs](../../../packages/kubernetes-workloads/scripts/exercise.mjs)
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
