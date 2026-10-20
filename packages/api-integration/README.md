# API integration: order status, GraphQL and gRPC

Laboratorio de P031 y tres ampliaciones, en español y draft. No usa Paysafe ni
cuentas externas. Los servicios solo escuchan en `127.0.0.1` y puertos efímeros.

## Ejecutar

Desde la raíz del monorepo, con Node >=24.19.0 y pnpm 12.8.1:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/api-integration test
pnpm --dir packages/api-integration demo
```

La demo y los tests crean y cierran sus sockets. No necesitas iniciar otro servidor,
Docker, certificados, una base de datos ni un broker. La instalación solo usa pnpm.
El postinstall de protobufjs se deshabilita explícitamente: solo emite avisos de
versiones y no genera el runtime que usa el ejercicio.

## Qué archivo corresponde a cada artículo

| Artículo | Fuentes | Comprobación |
| --- | --- | --- |
| [P031](../../posts/es/p031/README.md) | `orders.mjs`, `http.mjs`, `clients.mjs` | ETags, 304, replay/live, retención y proyección |
| [GraphQL](../../posts/es/api-integration-graphql/README.md) | `graphql.mjs`, `http.mjs` | 4 frente a 2 llamadas al repositorio, mismos datos |
| [gRPC](../../posts/es/api-integration-grpc/README.md) | `rpc.mjs`, `orders.proto`, `orders-legacy.proto` | Unary real, metadata, deadline/cancelación, cliente anterior |
| [Elección](../../posts/es/api-integration-choice/README.md) | `demo.mjs`, `results/experiment.json` | Mismo estado final en HTTP, SSE y gRPC; límites documentados |

`tests/integration.test.mjs` prueba mecanismos y casos negativos.
`tests/evidence.test.mjs` reproduce el JSON y prueba la simulación de tiempo lógico.

## Dos tipos de evidencia, sin benchmark de latencia

- `demo.mjs` abre sockets HTTP/SSE y gRPC reales. Cuenta 4 peticiones de polling
  (200, 304, 200, 200), frente a snapshot + stream para el consumidor de eventos.
  Recibe dos actualizaciones; ambos acaban en shipped v3. Los cambios se disparan
  desde el harness después de completar la operación anterior, sin reloj de carga.
- GraphQL.js y DataLoader ejecutan resolvers reales. El repositorio es un Map
  instrumentado: 1 lectura de pedidos + 3 de clientes frente a 1 + 1 con batching.
  No son consultas SQL, tiempos de red o porcentajes de mejora de latencia.
- `timeline.mjs` y `explorer.html` simulan lecturas cada Δ segundos entre 0 y 12,
  con cambios en 2, 5 y 9. No abren sockets ni asignan latencia cero a SSE.

Para regenerar la evidencia, revisa el diff y sincroniza solo los recursos estáticos:

```bash
pnpm --dir packages/api-integration demo --write
BLOG_ROOT=../luisrc-blog pnpm blog:sync
BLOG_ROOT=../luisrc-blog pnpm test:editorial
```

## Contratos del fixture y límites

- Identidades **públicas**: `Bearer fixture-north` y `Bearer fixture-south`.
  No se verifica un secreto, JWT ni sesión real. Son entradas educativas, no auth
  para desplegar. Cada consulta filtra por tenant, incluso con IDs repetidos.
- Snapshot HTTP con ETag exacto tenant/pedido/versión. Solo implementa la variante
  de `If-None-Match` que devuelve su cliente, no un parser completo de RFC 9110.
- SSE propio con cursor `after`, no un protocolo GraphQL subscription. Historial
  de 20 cambios por pedido; cursor fuera de retención da 410; futuro/malformado, 400.
  Replay y registro síncronos de un proceso, no transacción SQL + publicación.
- Máximo 16 streams globales, cierre a los 30 segundos y desconexión de consumidores
  lentos cuando `write` indica backpressure. Los clientes Node tienen timeout de 5 s.
  No heartbeat, auto-reconnect, token refresh ni revalidación durante el stream.
- La proyección rechaza schemas/pedidos distintos, ignora versiones repetidas y
  exige snapshot al detectar un hueco. Esto no hace idempotentes efectos externos.
- GraphQL HTTP permite exclusivamente el documento `ORDERS_QUERY`, con `first` 1–3
  y body JSON <=8192 bytes. No es un gateway GraphQL completo; no hay mutations,
  subscriptions ni control genérico del coste. `runQuery` permite otros documentos
  para los tests de schema. DataLoader se crea por operación y captura el tenant.
- gRPC usa `@grpc/proto-loader` en runtime, no stubs TypeScript generados. Unary
  solamente, transporte loopback sin TLS. El cliente viejo demuestra la lectura
  binaria al añadir campo 4, no compatibilidad universal con ProtoJSON o semántica.
- Cancelación de un timer observada tras deadline; no cancelación de SQL o efectos
  de negocio. Un timeout no implica rollback. Sin carga concurrente o p95 medido.
- Estado/eventos en memoria, sin persistencia, réplicas, outbox, broker, firma de
  webhooks o políticas egress. El restart perdería ambos. Los webhooks e inbox se
  explican en artículos anteriores con su propio laboratorio.

No proporcionar datos o credenciales reales ni cambiar las direcciones a interfaces
públicas. Los enlaces del índice requieren que el repositorio remoto exista y se suba;
los tests locales no afirman disponibilidad de GitHub.
