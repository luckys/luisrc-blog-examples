# Services, EndpointSlices y DNS: encontrar una API aunque cambien sus Pods

Artículo español en draft. Pregunta: Cómo relacionar nombre estable, selector, puerto y backends listos.

Fuentes completas y pruebas:

- [manifests/service.json](../../../packages/kubernetes-workloads/manifests/service.json)
- [manifests/client-pod.json](../../../packages/kubernetes-workloads/manifests/client-pod.json)
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
