# Ingress: una regla HTTP necesita un controller que la ejecute

Artículo español en draft. Pregunta: Cómo seguir host, ruta, Service y Pod sin confundir declaración con proxy.

Fuentes completas y pruebas:

- [manifests/ingress.json](../../../packages/kubernetes-workloads/manifests/ingress.json)
- [scripts/request.mjs](../../../packages/kubernetes-workloads/scripts/request.mjs)
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
