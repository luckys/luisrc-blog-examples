# Requests y limits: reservar sitio, limitar consumo y entender un OOMKilled

Artículo español en draft. Pregunta: Por qué un Pod puede quedar Pending o morir por memoria aunque haya CPU libre.

Fuentes completas y pruebas:

- [manifests/deployment.json](../../../packages/kubernetes-workloads/manifests/deployment.json)
- [manifests/unschedulable-pod.json](../../../packages/kubernetes-workloads/manifests/unschedulable-pod.json)
- [manifests/oom-pod.json](../../../packages/kubernetes-workloads/manifests/oom-pod.json)
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
