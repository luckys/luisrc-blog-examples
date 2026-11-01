# Vector retrieval: P111 desarrollado en nueve drafts verificados

Laboratorio con embeddings reales, comparación etiquetada BM25/vector, FAISS y
pgvector. El objetivo completo del roadmap sigue abierto. Nueve borradores escritos, con sus seis paneles del visor y seis figuras de resultados. Revisión editorial y de navegador completada; sin publicación.
Español solo, draft true/status draft, autor Luis Ramírez Calle.

## Preparación con pnpm

Node 24.19.0 o posterior y pnpm 12.8.1. Desde la raíz del monorepo:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/vector-retrieval test
pnpm --filter @luisrc-examples/vector-retrieval native:prepare
pnpm --filter @luisrc-examples/vector-retrieval native:probe
pnpm --filter @luisrc-examples/vector-retrieval verify
```

Los quince tests de geometría/pooling/vecinos/medición no requieren modelo ni Docker. `verify` audita
capturas guardadas y geometría sin inferencia, red, native addon o Docker. No vuelve
a medir latencia ni afirma reproducir tiempos. Los scripts de nuevos experimentos
se niegan a sobrescribir resultados existentes: preservarlos/versionarlos primero.

Todas las instalaciones JS se hacen con pnpm. native:prepare ejecuta únicamente el
instalador prebuild del binding; evita su fallback que llama a npm/compilación.
Registra hashes del addon y bibliotecas compartidas en native-runtime.json. El launcher
native-run configura LD_LIBRARY_PATH para ese bundle y threads antes de cargarlo.
No instala bibliotecas del sistema. Compatibilidad de prebuilds limitada a plataformas
publicadas por el binding; esta captura es linux/x64, Node 24.19.0.

## Datos, encoder y procedencia

Corpus20 y queries20 son copias sin modificar de P106, con juicios originales conocidos
por el autor, dev 10/test 10. No test ciego ni benchmark general. Incluye una consulta
sin respuesta relevante. No se corrigen etiquetas ni selecciona otro modelo tras resultados.

980 registros adicionales se generan con reglas deterministas y se codifican de verdad.
No tienen gold semántico: sirven únicamente para medir aproximación geométrica del índice.
Indexar1000 vectores no implica evaluar relevancia sobre1000 documentos etiquetados.

Encoder ONNX Xenova/paraphrase-multilingual-MiniLM-L12-v2, revisión
2c4055b12046f11709e9df2c122e59ffbdc2f900, q8, CPU, mean pooling con máscara,
384dim, máximo128tokens, batches8, threads2+1. Snapshot descargado y verificado contra
LFS SHA-256. Pesos solo en .cache/model, ignorados; no se exportan al blog ni comitean.
Los tokens especiales activos participan; padding no. Sin truncation en1020textos.
Resultados guardan vectores sin normalizar, IDs, máscaras y longitud previa al recorte.

Captura real 2026-10-31T09:58:38.974Z. Normas originales1.79368745–5.36446874.
Nueve hashes congelados, incluido dependency-lock.capture.json con bytes del lock
histórico. No es otro lock activo. No modificar esas fuentes sin versionar evidencia.

## Resultados conservados

Relevancia top3 en corpus20, macro sobre nueve consultas respondibles de test:

| Método | P@3 | R@3 | MRR@3 |
| --- | ---: | ---: | ---: |
| BM25 fold P106 | .296296 | .833333 | .888889 |
| Dense cosine | .296296 | .777778 | .722222 |

Q12 mejora recuperación de D06/D07; Q06 y Q17 empeoran. Q19 no recupera D17.
Q20 devuelve vecinos sin relevancia anotada. No se aprende umbral con ese único negativo,
ni se interpreta cosine como probabilidad. Las regresiones se conservan.

FAISS: FlatL2 exacto sobre mismos1000 vectores float32 normalizados; HNSW M4/M16,
efConstruction 40, efSearch 4/16/64. Siete estrategias, tres warmup rounds y 30 mediciones
por consulta/estrategia:4200 mediciones,140 vecindarios iniciales. Recall top10 de M4:
.40/.65/.825; M16:.51/.735/.90. No gold semántico para ese índice. Distancias y gaps de
frontera preservados; empates pueden afectar recall de conjuntos. Tiempos nativos solo
rodean search síncrono, excluyen encoder, IPC y mapping de IDs posterior al resultado.

Binding faiss-napi0.10.3: la fábrica devuelve Index genérico sin setters ef. Asignar
una propiedad JS no cambia FAISS. El constructor IndexHNSW directo carece de storage
Flat y abortó el probe. native-index usa factory HNSW,Flat y fromBuffer tipado para
obtener storage más getters/setters nativos. getEfConstruction/getEfSearch se verifican
antes de medir. No sustituir por propiedades de un objeto genérico ni quitar esas pruebas.

pgvector0.8.7/PostgreSQL17.11, imagen fijada por digest en postgres-runtime.json.
M16, efConstruction 40, efSearch 4/16/64, exact reference propia.2400 mediciones/80vecindarios.
Recall:.355/.75/.87; ef4 devuelve exactamente4 resultados al pedir10. No levantar ef
silenciosamente para ocultar el caso. Planes exactos, no forzados y HNSW efectivos guardados.
SETenable_seqscan=off se usa explícitamente para ejercitar el ANN; iterative_scan=off.

La latencia pg incluye cliente e IPC loopback y parsing; la nativa no. No comparar esas
cifras como kernels equivalentes ni extrapolar p95 local a producción. Un cliente,1000
textos sintéticos, sin concurrencia. Fases/cache no aleatorizadas. No best-run selection.
Contenedor temporal sin privilegios, root readonly, sin volúmenes persistentes, puerto
efímero127.0.0.1; se retiró tras capturar. Los índices FAISS generados quedan en .cache.

## Visor de fundamentos geométricos

`node packages/vector-retrieval/render-geometry.mjs` deriva un pack con los40 vectores
reales de documentos/consultas y la comparación original. No exporta los980 vectores de control ni pesos. Sí conserva los1000textos y los6600tiempos para auditar las salidas. El primer panel usa vectores 2D elegidos para explicar ángulo y escala; el
segundo permite comparar400 parejas reales e inspeccionar todas sus384 componentes.
Son ámbitos separados: no se presenta un dibujo2D como proyección del encoder.

La web calcula geometría localmente, sin inferencia ni backend. Las etiquetas de
relevancia siguen siendo juicios del autor. La pantalla redondea a9decimales; los
cálculos conservan sus valores. Catorce exports estáticos allowlisted del laboratorio.
El panel Vecinos FAISS reproduce140vecindarios de mil registros y distingue
etiquetas desconocidas de los980controles. Las figuras de recall, tamaño serializado
y relevancia se derivan con ECharts6.1.0 desde render-charts.mjs. Se normalizan sus
identificadores internos de estilos para obtener SVG deterministas. Los paneles de pgvector, relevancia y medición conservan planes Q01,80salidas SQL,40rankings y6600tiempos. La curva de tiempos ordena muestras, no muestra cronología. Cada selector muestra su ámbito y denominador.

## Comandos que producen experimentos nuevos

```sh
pnpm --filter @luisrc-examples/vector-retrieval model:fetch
pnpm --filter @luisrc-examples/vector-retrieval encode
pnpm --filter @luisrc-examples/vector-retrieval compare
pnpm --filter @luisrc-examples/vector-retrieval bench:native
pnpm --filter @luisrc-examples/vector-retrieval bench:postgres
```

encode, compare y ambos benches rehúsan reemplazar su archivo. La descarga model:fetch
verifica snapshot. Para repetir PostgreSQL hace falta la imagen del runtime ya disponible:

```sh
docker pull --platform linux/amd64 pgvector/pgvector@sha256:7d0a41464797aeb9862dfdc0bbf1526b82cfd324cdd8036df19e3545f4a9ccb8
```

Consultar [ruta editorial](../../docs/editorial/ruta-recuperacion-vectorial.md) y
[revisión/continuidad](../../docs/editorial/vector-retrieval-review.md). No publicar,
traducir, generar audio, hacer commit o push automáticamente.
