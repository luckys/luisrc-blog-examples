# Retrieval strategies: siete borradores españoles verificados

Siete borradores españoles: baseline léxica, dense retrieval, RRF, filtros, multi-query,
query rewriting y evaluación. Código de laboratorio solo en este paquete. Las fuentes
y capturas P112/P106/P111 importadas se conservan intactas. No se modifica ningún
protocolo antiguo para adaptar los resultados al nuevo ensayo.

## Preparación y auditoría

Node24.19.0, pnpm12.8.1. Dependencias con pnpm; no npm, pip ni instalación del sistema.
Desde la raíz del monorepo:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/retrieval-strategies test
pnpm --filter @luisrc-examples/retrieval-strategies verify
```

verify es de solo lectura: hashes, 33vectores, 60rankings, 36casos de filtros, 7casos
multi-query y16propuestas de rewrite, sus controles, métricas y regresiones. No vuelve
a inferir. Reproduce las listas BM25 originales de size32 para las20preguntas P112.

Para comprobar además todas las secuencias completas del tokenizer, preparar primero
los archivos del modelo verificados y ejecutar el modo opcional:

```sh
pnpm --filter @luisrc-examples/retrieval-strategies model:fetch
node packages/retrieval-strategies/verify.mjs --tokenizer
```

model:fetch copia la caché P112/P111 si existe o usa URLs de revisión fijada; verifica
todos los SHA. Pesos en .cache/model, ignorados. No API keys, no modelo remoto en runtime.

## Protocolo previo y entradas

protocol.json, variants.json, rewrite-cases.json y filter-cases.json se fijaron antes
de preparar results/inputs.json y antes de la nueva inferencia/rankings. Partición
size32 heredada:13chunks,367unidades,3documentos sintéticos conocidos. Se eligió esa
baseline sin tomar overlap8 por su métrica favorable.20preguntas ya vistas en P112:
10dev,8test con respuesta,2negativas test. No llamar test ciego a este ensayo.

Capture real única: MiniLM multilingüe q8/CPU/384d, Transformers.js3.8.1 y
ONNXRuntimeNode1.21.0.13chunks+20queries=33vectores. Attention-mask mean con special
tokens activos, sin truncation; límite de trabajo128. Modelo/revisión/digests en
model-files.json y runtime en runtime.json. El lock histórico se guarda como bytes
originales en dependency-lock.capture.json; no depende del lock futuro de otros labs.

results/retrieval.json conserva todos los rankings reales. BM25 fold/k1=1.2/b=.75,
coseno exacto y RRF constante60/ventana10; top3 al evaluar. Sin ANN ni reranking.
No retocar modelo,pooling,parámetros,gold ni repetir para obtener cifras favorables.

## Qué mide cada control

- Filtros:36combinaciones de6casos×3señales×2posiciones. Scores globales fijos,
  filtro antes/después de top3. En RRF se filtra después de fusionar ventanas de los
  hijos. No ejecución nativa de prefilter, no comparación de latencia ni sistema ACL.
  Gold incompatible con el filtro → métricas null y motivo explícito.
- Multi-query:7casos con original+2paráfrasis del autor,3búsquedas BM25 por caso.
  Identidades/textos deduplicados,RRF60/10. No inferencia de un generador. Q08pierde
  cobertura de1a0; Q18sigue incompleta. No seleccionar una paráfrasis favorable después.
- Rewrite:8propuestas equivalentes según autor y8controles alterados. Guard de tokens,
  fallbackoriginal si falta alguno. Acepta las8equivalentes, rechaza7alteradas yacepta
  el control Q13alterado. Su retrieval sigue con cobertura1: no demuestra fidelidad.

## Resultados conservados

Test8conrespuesta:BM25 cobertura.9791667/completitud7de8;denso.7791667/5de8;
RRF.8541667/6de8. Q12RRF mejora denso;Q14BM25evidencia1ª,denso9ª,RRF4ª yse pierde
en top3. Q06yQ18incompletas enlos3. Q19devuelve3sinrespuesta en todos;Q20BM25=0,
denso/RRF=3. Negativas cobertura/completitud=null yseparadas delpromedio.

Estos datos no prueban calidad para otro corpus, producción, respuestas generadas o
coste end-to-end. El gold depende de rangos elegidos y versiones; revisar casos.

## Captura original y derivados

Orden histórico, NO necesario para auditar; comandos rehúsan sobrescribir resultados:

```sh
pnpm --filter @luisrc-examples/retrieval-strategies prepare
pnpm --filter @luisrc-examples/retrieval-strategies model:fetch
pnpm --filter @luisrc-examples/retrieval-strategies capture
pnpm --filter @luisrc-examples/retrieval-strategies evaluate
```

Para otro ensayo, versionar protocolo y rutas, guardar gold antes y conservar este
resultado. El verificador opcional se corrigió durante desarrollo para pasar un array
de un texto al tokenizer; no cambió captura ni repitió inferencia.

El visor deriva de estas capturas y no carga modelos. Paneles comparar, fusión,
filtros,multi-query,rewrite,evaluación. Los controles de k/RRF/subconjuntos solo operan
sobre listas guardadas; no validan nuevas configuraciones.12exports públicos estáticos,
sin pesos ni laboratorios completos. Reusa contextEvidence de document-ingestion.

```sh
pnpm --filter @luisrc-examples/retrieval-strategies render
node packages/retrieval-strategies/render-charts.mjs
```

Ver docs/editorial/retrieval-strategies-review.md para la revisión editorial final.

Los paneles Comparar y Fusión incluyen SVG dinámicos: cobertura por hecho con escala
fija0–100% y contribuciones por hijo con escala0..2/(C+1). No proyección inventada de
embeddings. El resto de figuras estáticas se deriva de la captura original.
