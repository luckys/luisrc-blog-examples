# Kubernetes workloads: ejecutar y observar una API

Once drafts españoles completan el bloque Kubernetes de P065. Ejemplos JSON
para la misma API: Pods, Deployment/ReplicaSet, Service/DNS/EndpointSlice,
Ingress, tres probes en artículos separados, ConfigMap, Secret/RBAC, recursos
con OOM y HPA con métricas y réplicas reales. Complementa declarative-infrastructure.

## Ejecutar desde la raíz del monorepo

Node24.19.0+, pnpm12.8.1 y Docker Linux compatible con K3s privilegiado/cgroups.
No utiliza kubeconfig personal, credenciales de nube o secretos reales.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --dir packages/kubernetes-workloads test
pnpm --dir packages/kubernetes-workloads exercise
pnpm --dir packages/kubernetes-workloads verify
pnpm --dir packages/kubernetes-workloads render
```

Test no inicia containers. Exercise crea un K3s de un nodo, con API y HTTP solo
en puertos loopback aleatorios; necesita acceso inicial a las images/componentes.
Usa kubectl dentro del container. Construye dos images Node con versión fijada en
archivo durante build e importa ambas al runtime containerd local. No instala
binarios host. Las tools y base están fijadas por digest en tools.json/Dockerfile.

Los manifests JSON son plantillas: el harness añade su namespace aleatorio y
sustituye LAB_IMAGE_V1/LAB_NAMESPACE. No deben aplicarse a un contexto personal.
El paquete no tiene dependencias npm; pnpm12 omite su importador vacío en el lock.

## Recorrido observado

- UID del Pod cambia al sustituirlo, image ID permanece; ReplicaSet pertenece al Deployment.
- Rollout a imagev2 y undo a v1; respuestas HTTP verifican el archivo de versión baked.
- DNS y llamada al Service desde Pod cliente separado; ClusterIP y EndpointSlice.
- Ingress por Host: catálogo200 frente a host no coincidente404.
- Inicialización8s con startup sin restart; Pod negativo sin startup sí reinicia.
- Readiness retira elegibilidad del endpoint, da503 vía Traefik y conserva UID/restarts.
- Liveness provoca restart dentro del mismo Pod; señal restaurada y HTTP recuperado.
- Volumen ConfigMap actualizado con env antiguo; nuevo env después de rollout restart.
- Role permite un ConfigMap y deniega Secret con Forbidden mediante impersonation;
  fixture base64 comprobada sin publicarla, automount de token desactivado.
- Request CPU imposible: Pending/Unschedulable; otro Pod de64Mi termina OOMKilled
  al tocar buffer256Mi. No se provoca OOM del host ni se deja un crash loop de prueba.
- HPA de CPU con request50m,target50%,min1/max3 y reducción estabilizada30s.
  Ocho clientes de trabajo CPU sintético: métricas, réplicas deseadas/preparadas,
  aumento y reducción reales. No hay benchmark ni SLA de escalado.
- Namespace propio eliminado y clúster/red propios cerrados. Images retenidas.

El API de fixture lee flags desde ConfigMap para reproducir fallos. No es un
patrón de producción para hacer depender liveness de configuración remota.
El trabajo CPU está acotado a40ms por petición y los containers tienen límites.

## Evidencia y visor

`evidence/kubernetes.json` guarda23fases, muestras HPA y hashes de entradas del
experimento. `replay.json` omite solo ese mapa de fuentes. `verify` contrasta esos
archivos offline; no repite el despliegue. El gráfico deriva de muestras reales;
`chart.mjs` solo calcula coordenadas, no simula un HPA.

El visor HTML/JS solo carga archivos estáticos. Fases y campaña HPA tienen
selectores independientes; no se heredan observaciones HTTP ni se atribuyen
métricas históricas a otra fase. Desconocido se muestra «No capturado».

El estado HPA y el Deployment se actualizan de forma asíncrona; las consultas no
forman un snapshot atómico. El status inicial desired0 sin CPU válida se conserva
en tabla, pero no se dibuja como recomendación. Una muestra puede combinar current antiguo con ready
nuevo. Contadores de carga pueden incluir trabajo en curso hasta detener los
clientes. Las lecturas posteriores no prueban continuidad durante rollout.

Solo se exportan HTML/JS del visor, chart.mjs, replay.json y SVG mediante blog:sync.
API, harness, manifests y tests permanecen aquí. No se publica Secret ni tokens.
La identidad reader se prueba mediante impersonation autorizada del administrador
del clúster efímero; no se prueba autenticación de un token real.

## Limpieza y límites

El nombre debe estar libre antes de crear red/container. Finally actúa solo sobre
recursos adquiridos por la ejecución, sin prune. Checkpoints privados en
`.artifacts/` ignorado. Fallar no sobrescribe la evidencia final anterior; revisar
fecha y checkpoint. La terminación forzada del harness/host no se ha ensayado.

No HA/multinodo, cifrado de Secrets, TLS, NetworkPolicy, almacenamiento persistente,
load balancer cloud o autoscaling de nodos probados. El bucle Pod→Service→mismo Pod
no queda acreditado; la prueba positiva usa un cliente diferente. No se alteran
sysctls globales del host para dar por válido otro recorrido de red.

Al cambiar fuentes, repetir exercise/verify/render y sincronizar exports. La
configuración pnpm compartida deniega explícitamente scripts auxiliares Scarf y
optimizaciones SSH opcionales; no desactiva la política de scripts ignorados.
