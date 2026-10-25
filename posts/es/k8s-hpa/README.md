# HPA: observar cómo las métricas cambian las réplicas de una API

Artículo español en draft. Pregunta: Cómo interpretar CPU relativa a requests, estabilización y escalado real.

Fuentes completas y pruebas:

- [manifests/hpa.json](../../../packages/kubernetes-workloads/manifests/hpa.json)
- [app/server.mjs](../../../packages/kubernetes-workloads/app/server.mjs)
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
