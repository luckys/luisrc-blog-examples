# Infraestructura declarativa: Terraform y Kubernetes local

Laboratorio del bloque Terraform de P065. Seis drafts españoles explican
configuración/plan/apply, providers, state, módulos, drift y cambios revisados.
El bloque específico de Kubernetes se desarrolla en el paquete hermano
kubernetes-workloads. Esta integración Terraform conserva su alcance propio.

## Requisitos y ejecución

Node24.19.0+, pnpm12.8.1 y Docker Linux capaz de ejecutar K3s privilegiado con
cgroups. No utiliza kubeconfig personal, recursos cloud o credenciales privadas.
Terraform y kubectl se ejecutan dentro de containers; no instala binarios host.
El primer recorrido necesita red para las images, componentes K3s y provider.

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --dir packages/declarative-infrastructure test
pnpm --dir packages/declarative-infrastructure exercise
pnpm --dir packages/declarative-infrastructure verify
pnpm --dir packages/declarative-infrastructure render
```

`test` no inicia Docker. Prueba el resumen de planes y límites de alcance, la API
HTTP y el envío explícito del Host que selecciona el Ingress. `exercise` crea un
clúster real K3s de un nodo y una image Node del laboratorio. Importa esa image en
containerd y usa el provider Kubernetes para aplicar seis recursos propios:
namespace, ConfigMap, Secret ficticio, Deployment, Service e Ingress Traefik.

Las versiones CLI, K3s y provider están en tools.json/versions.tf. El lockfile
Terraform es del provider, no una instalación Node independiente. La API no tiene
dependencias de terceros; pnpm12 puede omitir su importador vacío del lock raíz.

## Qué observa el recorrido

- Nodo y controlador Ingress disponibles; publicación exclusivamente en loopback.
- Provider3.4.0, Terraform1.15.3, fmt/validate e init con lockfile readonly.
- Seis creaciones, apply y HTTP con el mensaje esperado, seguido de plan sin cambios.
- Pod borrado y repuesto por Kubernetes con otro UID, sin necesitar apply Terraform.
- Cambio manual del ConfigMap visible en HTTP, detectado y reparado por plan/apply.
- Plan anterior rechazado como stale tras otro apply que avanzó el state.
- ConfigMap reemplazado con create_before_destroy; Deployment actualizado, HTTP
  validado y ausencia del nombre anterior comprobada.
- Refresh-only acepta observación en state y conserva el mensaje manual; un plan
  ordinario sigue proponiendo reparación y su apply recupera el objetivo.
- Destroy de los seis recursos, namespace ausente, state vacío y clúster/red eliminados.

No hay HA, autoscaling, TLS, benchmark, locking remoto o fallo a mitad de apply
inyectados. Las peticiones después de cada fase no prueban disponibilidad continua.

## Evidencia, privacidad y limpieza

`evidence/terraform.json` conserva observaciones finales y hashes. `replay.json`
es su copia sin el mapa de fuentes para el visor estático. El informe solo contiene
metadatos de planes y hechos sanitizados; nunca el plan/state completo o kubeconfig.
La fixture de Secret es pública e intencionalmente falsa. La prueba observa que
el plan marca el atributo sensible y que el state contiene esa fixture; publica
solo booleanos. No uses este ejemplo para introducir secretos reales.

Cada ejecución genera un nombre aleatorio y confirma que no existen su container
y red antes de adquirir su propiedad. Finally solo elimina los recursos propios
creados. No usa prune ni contextos Kubernetes externos. Retiene la image de API
para inspección. El kubeconfig y tar de image se eliminan al acabar correctamente.

Los checkpoints y planes/state privados permanecen en `.artifacts/`, ignorado por
Git. Una ejecución fallida no sobrescribe la evidencia final anterior: comprueba
fecha y checkpoint. El clúster propio se elimina también al fallar el recorrido.
No se ha ensayado la terminación forzada del propio harness o del host.

`verify` revisa archivos y hashes offline; no repite el despliegue. Para cambiar
fuentes del experimento hay que repetir exercise y luego verify/render. El visor
solo lee replay.json; no tiene canal de control. Desde la raíz del monorepo:

```bash
BLOG_ROOT=/ruta/al/blog pnpm blog:sync
```

Se exportan únicamente cuatro recursos estáticos: HTML, JavaScript del visor,
replay.json y gráfico SVG. La aplicación de API, HCL, tests y harness permanecen
en este repositorio.
