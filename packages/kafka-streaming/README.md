# Kafka streaming

Cinco posts españoles de P051. Broker real Apache Kafka 3.9.1, KafkaJS 2.2.4,
Node.js 24.19.0, TypeScript 5.9.2 estricto y pnpm 12.8.1. Versiones fijadas para
reproducir el ejercicio, no afirmación de últimas versiones ni receta de producción.

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/kafka-streaming test
pnpm --dir packages/kafka-streaming typecheck
docker pull apache/kafka:3.9.1@sha256:4ceccc577f03f51f6af8dbfda55194d0d892f4fa7913ffbded567ce3895622ed
pnpm --dir packages/kafka-streaming broker:up
pnpm --dir packages/kafka-streaming test:integration
pnpm --dir packages/kafka-streaming broker:down
```

Docker solo para integración. Arranque con --pull=never, nombre/label fijo, KRaft
broker/controller de un nodo y RF=1. Solo publica 127.0.0.1:19092. Sin volumen host,
TLS, SASL o credenciales. Límite 1 GiB/2 CPU; cliente restringido a loopback.
No reutiliza un contenedor de igual nombre sin label del lab. Comprueba disponibilidad
por API; ante fallo consulta logs de luisrc-editorial-kafka-391 y ejecuta broker:down.

**broker:down pierde los datos ficticios del contenedor desechable** y Docker lo
retira automáticamente. No retira la imagen descargada ni datos del usuario.
No utilizar esta configuración para información importante o una red pública.

Los tests crean topics/grupos con UUID y retiran solo los que crearon. DeleteGroups
69 significa grupo ya inexistente y solo ese error se considera cleanup cumplido.

## Relación con los posts

| Post | Fuentes | Observación |
| --- | --- | --- |
| P051 | scripts/broker.mjs, tests/broker.test.mjs | consumo no destructivo; política configurada; inicio avanzado por DeleteRecords |
| KAFKA-PARTITIONS | src/client.ts, fixtures.ts, tests/broker.test.mjs | keys estables, versiones 1/2/3; ambas keys colisionan en partición 1 |
| KAFKA-GROUPS | tests/broker.test.mjs | dos miembros reales y salida limpia con reasignación |
| KAFKA-REPLAY | src/projection.ts, offsets.ts, collect.ts | redelivery 0; commit 1 reanuda 1/2; otro grupo reconstruye dos envíos |
| KAFKA-PRESSURE | src/offsets.ts, collect.ts, tests/broker.test.mjs | end 3, commits 0/1/3, lag 3/2/0 y pause/resume |

Ocho pruebas locales y cinco de broker. verify-broker.mjs solo guarda
evidence/broker.json si todos los casos pasan y hay cinco resultados. No contiene
mediciones usadas como benchmark o identificadores de servicios reales.

## Supuestos y límites

- Eventos ficticios schemaVersion 1, eventId, shipmentId como key, versiones 1 created,
  2 shipped, 3 delivered. JSON/UTF-8/campos validados; no tombstones/coerción.
  Se descartan campos extra; no Schema Registry.
- Proyección/dedup volátiles, sin efectos externos. Checkpoint en Kafka no hace
  durable la vista. Reanudar prueba offsets; reconstruir usa otro grupo y vista vacía.
  Sin SQL, commit atómico externo o exactly-once de negocio.
- collect es finito: 1–1000 registros, deadline 25 s, autoCommit false, fetch limitado,
  callback esperado y secuencia por partición. No daemon. Pause no regula al productor
  ni impide toda precarga. No perfilado de memoria o benchmark.
  El deadline falla la espera de resultados; el cierre es cooperativo y espera al
  callback. No mata por fuerza un callback bloqueado o un efecto externo pendiente.
- Protocolo clásico, no nuevo consumer protocol/share groups. Dos miembros en un
  proceso; salida limpia, no kill/crash. Sin failover, RF>1, retries bajo caída,
  ampliación de particiones, TLS/SASL o carga sostenida.
- acks=all con RF=1 no prueba redundancia. Política delete y retention.ms=3600000
  comprobadas por API. No espera expiración natural ni compaction. DeleteRecords
  explícito muestra historia insuficiente, no prueba el scheduler de retención.
- Offsets BigInt/string y lag de posiciones, no tiempo ni recuento universal de
  registros. null es ausencia de checkpoint; -1 administrativo no es posición válida.

## Problemas observados

Tests primero: imports ausentes. Ocho casos locales pasaron al implementar. En
integración pasaron cuatro; DeleteRecords falló al buscar líderes en la caché de
KafkaJS. fetchTopicMetadata previo lo corrigió sin cambiar low=2/high=3. Cleanup
pasó a borrar grupos antes de topics y tratar solo GROUP_ID_NOT_FOUND (69).

KafkaJS 2.2.4 con Node 24 puede emitir TimeoutNegativeWarning. Se verificó el stack
con --trace-warnings: requestQueue/index.js, scheduleCheckPendingRequests, resta
Date.now() de throttledUntil=0 sin throttle. No se oculta ni parchea la dependencia;
los asserts reales siguen siendo obligatorios. El warning no prueba pérdida de
mensajes o clock skew. No se comparó otro cliente para recomendar una versión.
