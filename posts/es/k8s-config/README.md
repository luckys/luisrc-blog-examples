# ConfigMaps: por qué cambia un archivo y una variable de entorno sigue igual

Artículo español en draft. Pregunta: Qué se actualiza al proyectar configuración y qué requiere nuevos containers.

Fuentes completas y pruebas:

- [manifests/configmap.json](../../../packages/kubernetes-workloads/manifests/configmap.json)
- [manifests/deployment.json](../../../packages/kubernetes-workloads/manifests/deployment.json)
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
