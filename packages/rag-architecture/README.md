# RAG architecture: contracts, permissions and physical index boundaries

Laboratorio sintético de P115 y entregas relacionadas. Estado de la serie: **en curso**.
Nueve entregas cubren requisitos/contratos, permisos, comparación de aislamiento
y conversaciones, además de multi-step retrieval, caché, actualizaciones, context design
y RAG vs fine-tuning. La revisión editorial final sigue en curso. No es un servicio RAG de respuestas: no ejecuta un generador.

## Qué ejecuta

PostgreSQL 17 mediante imagen Docker por digest, 12 documentos sintéticos, cuatro
identidades y 28 consultas/gold redactados antes del ensayo. Dos layouts producen
56 solicitudes reales. Otras 69 comprobaciones ejercitan SELECT sin WHERE, IDs ajenos,
cambios de rol, escritura, GUC fingida y conexión a otra base. Cuenta también planes,
archivos y tamaños reales de tabla e índices. No hay documentos privados ni secretos.

`rag_global` contiene 12 filas bajo RLS. `rag_alpha` y `rag_beta` contienen seis cada
una y sus propios índices. Comparten cluster, CPU, RAM, WAL y administrador. Esta
separación no prueba aislamiento de procesos, noisy neighbors, backup o side channels.
La autenticación trust existe solo en el contenedor efímero ligado a loopback; no es
una configuración de producción ni un ejemplo de autenticación web.

La identidad de cada solicitud es una conexión real por rol LOGIN, no SET ROLE desde
un superusuario. Los lectores son NOSUPERUSER/NOBYPASSRLS y no poseen tablas. RLS
consulta un principal administrado fuera de la petición. No usa app.tenant para autorizar.
El índice GIN se crea de verdad; EXPLAIN conserva la decisión real del planner. No se
presupone que un corpus de seis o doce filas vaya a usarlo para las consultas.

## Reproducir y verificar

Desde la raíz del monorepo, Node >=24.19 y Docker disponible:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/rag-architecture test
pnpm --filter @luisrc-examples/rag-architecture verify
```

La verificación es de solo lectura, sin Docker ni nueva inferencia. Comprueba hashes,
matriz completa, identidades, filas exactas, scope, métricas y controles negativos.
`results/isolation.json` es una captura única. `capture` rechaza sobrescribirla o
ignorar un fallo registrado. Para un nuevo ensayo, crea una copia versionada del
laboratorio/protocolo, mantén los originales y ejecuta:

```sh
docker pull pgvector/pgvector@sha256:7d0a41464797aeb9862dfdc0bbf1526b82cfd324cdd8036df19e3545f4a9ccb8
pnpm --filter @luisrc-examples/rag-architecture capture
```

No borres capturas para elegir un resultado favorable. El contenedor usa tmpfs, puerto
efímero loopback y se elimina al terminar incluso si las aserciones fallan. No toca
bases existentes. `dependency-lock.capture.json` conserva el lock previo a la captura.

## Límites y visor

Full text search exacta, configuración `simple`, sin embeddings, ANN, reranker o LLM.
Las consultas usan términos controlados sin tildes; no es un benchmark de español.
Recall@3 evalúa IDs relevantes **ya autorizados**, no la calidad de una respuesta.
El gold vacío tiene recall null. La igualdad observada entre layouts depende de esta
función ts_rank por documento y de la misma información/configuración; no se extrapola
a BM25 con estadísticas globales ni a vecindarios ANN.

El visor es una reproducción estática de datos sintéticos públicos. Permite alternar
identidades para aprender; no autentica al visitante ni demuestra acceso web seguro.
No representa una consulta nueva de base de datos. El fallo de generación de P114
permanece: ninguna de sus 61 generaciones cumplió el contrato. Estas pruebas de
arquitectura no convierten esa cadena en un generador útil validado.

## Conversaciones: segundo protocolo independiente

`conversation-protocol.json` fija 21 escenarios antes de otra ejecución efímera. El
almacén Conversations asocia un UUID a identidad/tenant y referencias ID+revisión.
Cada resume relee principal y fuentes en REPEATABLE READ READ ONLY. Los dos gestores
pierden permiso antes de una nueva solicitud; sus referencias ya no aportan texto.
No se probó revocación dentro de un snapshot en marcha ni un modelo resolviendo
ambigüedades. No incluye login HTTP, persistencia, TTL, cuotas o generación. Los controles de
referencias ajenas/revisiones incorrectas son datos deliberados del laboratorio.

```sh
node packages/rag-architecture/verify-conversation.mjs
node --test packages/rag-architecture/tests/conversations.test.mjs
```

`results/conversation.json` conserva 21 casos: 7 ready, 8 forbidden, 4 unavailable_reference,
1 not_found y 1 no_evidence. ready significa evidencia autorizada, no respuesta correcta.
`capture-conversation.mjs` rechaza sobreescribir capturas o ignorar su fallo. Conservar
fuentes por SHA; un ensayo distinto necesita nuevas rutas/protocolo. El visor de 21 casos
es estático, público y sintético. La captura original de aislamiento no se modifica.

## Multi-step: referencias y presupuestos

El protocolo multistep-v1 y sus 44 casos fijan tareas tipadas, grafos redactados y gold
antes de ejecutar. Hay 60 lecturas de fuentes reales en total bajo RLS; las consultas
de identidad/principal quedan fuera de ese contador. El workflow sigue referencias
nuevas y limita llamadas, fuentes conservadas y referencias únicas encoladas. No hay
parser de enlaces, agente o interpretación de preguntas con LLM.

```sh
node packages/rag-architecture/verify-multistep.mjs
node --test packages/rag-architecture/tests/multistep.test.mjs
```

El verificador reproduce decisiones desde las consultas guardadas sin volver a usar
PostgreSQL. Diez requirements_met, doce call_budget, cuatro source_budget, catorce
no_progress y cuatro no_results. El límite de cola se prueba unitariamente; no se
alcanza en la matriz SQL. Cobertura de IDs autorizados no equivale a calidad de respuesta.
Todos los archivos de sourceHashes son inmutables para esta captura. Extender otro
experimento mediante nuevos archivos; reutilizar database-fixture sin editarlo.

## Caché: ámbito, ACL, errores y caducidad

El protocolo retrieval-cache-v1 fija 22 solicitudes secuenciales. Principal y estado
administrativo se cargan en un snapshot por solicitud; la clave incorpora identidad,
tenant, nivel, revisión del principal, revisión global de acceso, índice/config/query.
La revisión de índice es fija y no demuestra activación de un índice nuevo. Los
cambios de ACL y accessRevision se confirman juntos. El script es el camino probado;
no hay trigger que impida a un administrador saltarse la actualización de revisión.

```sh
node packages/rag-architecture/verify-cache.mjs
node --test packages/rag-architecture/tests/retrieval-cache.test.mjs
```

Ocho hits, trece misses (dos errores SQL22012 incluidos), una caducidad; catorce
operaciones de fuentes. TTL3000ms con espera nativa3100ms. Las pruebas de frontera
exacta usan reloj simulado y se identifican aparte. El verificador reproduce los
tiempos guardados sin esperar ni consultar SQL. No benchmark de latencia, LLM,
cache distribuida, stampede o revocación en una transacción que ya esté en marcha.
El almacén clona filas y limita128entradas FIFO; la expulsión es solo prueba unitaria.
Las entradas de claves antiguas quedan fuera del recorrido nuevo, no borradas de
forma instantánea. La cuota tampoco es de bytes. Conservar capturas y fuentes SHA.

## Actualización: candidata, publicación y fuentes históricas

`updates-protocol.json` fija una nueva captura PostgreSQL. La candidata empieza con
once documentos; se rechaza sin cambiar v1. Tras completar doce IDs/textos exactos,
se activa v2 mediante comparación de puntero esperado. El intento posterior obsoleto
actualiza cero filas y se rechaza. SHARE protege validación/publicación frente a
escrituras incompatibles; el administrador todavía puede cambiar contenidos después.

```sh
node packages/rag-architecture/verify-updates.mjs
node --test packages/rag-architecture/tests/updates.test.mjs
```

Dos solicitudes tienen transacciones solapadas: la abierta antes conserva v1 mientras
una nueva usa v2. El orden es determinista, no carga concurrente. Once búsquedas,
cuatro hits y siete lecturas de fuentes. Nueve citas, cuatro resueltas; la ACL vigente
se mantiene fuera del contenido versionado para aplicar restricciones también a v1.
Reader pierde las dos citas de caché y manager conserva ambas. Metadata almacenada de
nivel cero no sustituye el nivel efectivo uno tras la modificación. Hay67eventos.

No LLM, nuevo entrenamiento, ANN, offsets de cita, latencia, GC, rollback a v1,
backup o failover probados. Captura y fuentes SHA inmutables, original fixture intacto.
El verificador hace replay de caché y comprueba estados/orden/ACL sin repetir SQL.

## Context design: conteo sin inferencia

`context-protocol.json` fija diez escenarios, ventanas192/320/512, reserva64 y dos
prioridades. Se realizan60composiciones y165conteos de plantilla completa con el
tokenizer Qwen fijado; no hay modelo ejecutado ni nuevos scores de recuperación.
Historiales y orden de candidatas son fixtures redactadas. Las fuentes proceden de
los snapshots declarados; T10 añade un fragmento largo explícitamente sintético.

```sh
pnpm install --frozen-lockfile --ignore-scripts
node packages/rag-architecture/prepare-context-tokenizer.mjs
node packages/rag-architecture/verify-context.mjs
node packages/rag-architecture/verify-context.mjs --tokenizer
```

La preparación copia JSON verificados desde la caché anterior si existe o descarga
solo esos ocho metadatos desde URLs por revisión/SHA. No descarga .onnx/pesos. La
caché local está ignorada y no aparece en índices por post ni exports. Dependencias
HF3.8.1 instaladas conpnpm; context-dependency-lock.capture.json es nuevo, sin tocar
el lock histórico congelado de los protocolos previos.

34ready,8base_over_budget,6no_evidence,12rejected_scope. Ready significa evidencia
admitida con entrada+reserva<=ventana elegida, no respuesta correcta. En T05/320,
history_first conserva1fuente/H3 y254tokens; evidence_first3fuentes/sinhistorial y167.
Con512ambos3fuentes/H2H3/443tokens. T09base1283nunca cabe; no se recorta. T03base131
no cabe en128de entrada. T10descarta fuente larga completa yconservaS02. El falso
contador de caracteres solo prueba ramas unitarias y no se presenta como tokenización.

El verificador por defecto reproduce las decisiones desde mediciones congeladas.
--tokenizer comprueba los165IDs reales otra vez sin inferencia. JSON/escape de marcas
preserva delimitadores sintácticos, no demuestra resistencia semántica a prompt
injection. No autenticación, garantía de evidencia suficiente, latencia o carga LLM.

## Cierre: fuentes, instrucciones y pesos

El inspector final deriva60descriptores de los contextos congelados:34preparados y
26rechazados. No ejecuta ninguno. El perfil es el único checkpoint baseline conocido,
adapter:null. No hay artefacto fine-tuned de RAG nuevo ni comparaciónA/B de calidad.
Los perfiles alternativos de los tests son controles unitarios ficticios. Los checks
de versiones no demuestran compatibilidad numérica al cargar pesos o calidad de salida.

```sh
node packages/rag-architecture/verify-generation-contracts.mjs
pnpm --filter @luisrc-examples/rag-architecture verify
```

El comando verify ahora reúne los siete verificadores de capturas/derivados sin SQL
ni inferencia. La retokenización opcional se ejecuta con verify:tokenizer tras preparar
los JSON. Todo contenido del visor es sintético y estático, con límites explícitos.
P114 sigue sin ninguna respuesta aceptada; preparar descriptores no cambia ese resultado.
