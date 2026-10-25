# Liveness probe: cuándo reiniciar ayuda y cuándo multiplica el problema

Artículo español en draft. Pregunta: Cómo distinguir un container bloqueado de una dependencia indisponible.

Fuentes completas y pruebas:

- [manifests/deployment.json](../../../packages/kubernetes-workloads/manifests/deployment.json)
- [app/server.mjs](../../../packages/kubernetes-workloads/app/server.mjs)
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
