# Startup probe: dar tiempo al arranque sin convertirlo en un bucle de reinicios

Artículo español en draft. Pregunta: Cómo proteger una inicialización lenta antes de activar las otras probes.

Fuentes completas y pruebas:

- [manifests/slow-start-pod.json](../../../packages/kubernetes-workloads/manifests/slow-start-pod.json)
- [manifests/no-startup-pod.json](../../../packages/kubernetes-workloads/manifests/no-startup-pod.json)
- [app/server.mjs](../../../packages/kubernetes-workloads/app/server.mjs)
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
