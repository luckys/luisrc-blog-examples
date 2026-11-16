# Document ingestion: nueve borradores españoles verificados

Laboratorio canónico fuera del blog. Serie prevista de nueve artículos en español.
Serie: PDF/HTML, OCR real, layout, provenance/metadata, dedup, tamaño,
fronteras semánticas, overlap y evaluación comparada. P112 desarrollado y verificado como serie; los borradores
no implican que todo el roadmap esté completo ni están publicados.

## Preparación

Node24.19.0/pnpm12.8.1. El colector original usa pdftotext/pdftoppm24.08.0 ya disponibles
en el entorno; verify no requiere Poppler, OCR, modelo, Docker ni red.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/document-ingestion test
pnpm --filter @luisrc-examples/document-ingestion verify
```

Ninguna instalación mediante npm, pip o gestor del sistema. Dependencias JS con pnpm.
Tesseract.js7.0.0 y core7.0.0 usan WASM local. Modelo español tessdata_fast4.1.0,
commit65727574dfcd264acbb0c3e07860e4e9e9b22185, Apache2.0, digest en ocr-model.json.
La primera descarga pública establece el digest antes del OCR; no es una firma del
editor. Descargas siguientes se verifican. Pesos solo .cache, ignorados y no exportados.

## Evidencia e incidencia del adaptador

Tres PDFs originales sintéticos: digital, dos columnas y scan de imagen sin texto.
Dos HTML de mismo main con footer distinto. El generador fija fechas y conserva
truth antes de OCR. Son fixtures controlados, no documentos escaneados del mundo real.

results/extraction.json conserva la única ejecución Poppler/OCR. En esta versión
el TSV no tiene cabecera: el primer colector asumía una y su campo auxiliar words
quedó vacío. Texto, bloques, TSV y CER del motor sí estaban completos. No se corrige
esa captura histórica ni se vuelve a ejecutar el motor. ocr-tsv.mjs y derive.mjs
producen results/ocr-words.json desde el TSV original. El verificador contrasta
texto y cajas también con blocks, independientemente de ese adaptador.

El script capture.mjs se conserva como fuente exacta del colector original y su
defecto documentado. Los nuevos consumidores usan ocr-tsv.mjs. Las entradas capture
y derive rechazan sobrescritura: para otro ensayo versionar protocolo y rutas,
sin cambiar esta evidencia. El runtime y lock históricos se archivan explícitamente.

## Comandos del experimento original

```sh
pnpm --filter @luisrc-examples/document-ingestion fixtures
pnpm --filter @luisrc-examples/document-ingestion model:fetch
pnpm --filter @luisrc-examples/document-ingestion capture
node packages/document-ingestion/derive.mjs
```

Estos comandos no son necesarios para leer/auditar resultados y rehúsan sustituir
artefactos existentes. Los últimos deben ejecutarse desde la raíz según sus rutas.
No se afirma reproducir latencias. El visor reproduce evidencia guardada en diez paneles y no carga modelos.

## Ledger, deduplicación y ventanas

Nueve fuentes y 760 unidades trazables; tres representantes del corpus (RUNBOOK,
COLUMNS, HTML) con 367 unidades. Los controles de números y negaciones no se indexan.
Las ventanas de 16/32/48 unidades producen 25/13/9 chunks. Los 47 conteos del tokenizer
se guardaron sin ejecutar el encoder y pueden verificarse aparte:

```sh
pnpm --filter @luisrc-examples/document-ingestion verify:ledger
node packages/document-ingestion/verify-ledger.mjs --tokenizer
```

El segundo comando requiere los archivos locales del tokenizer. `tokenizer:fetch`
los copia de la caché verificada de vector-retrieval o descarga su revisión fijada.

## Protocolo final y capturas preservadas

chunking-protocol.json y retrieval-queries.json quedaron fijados antes de la nueva
inferencia y los rankings. results/chunk-inputs.json conserva runtime, gold y 44
piezas de sentence segmentation alineadas. semantic-model-files.json fija revisión
y SHA de todos los archivos MiniLM q8. Pesos solo en .cache/semantic-model, ignorados.

La ejecución local única guardada en results/semantic-embeddings.json produjo 44
vectores reales de 384 dimensiones (CPU, Transformers.js3.8.1, ONNXRuntimeNode1.21.0,
mask mean incluyendo special tokens activos). Sin truncation; límite de trabajo128.
No se ha seleccionado una repetición favorable ni ajustado el umbral después.

Las 41 distancias superaron 0,35: la política semántica cortó todas las fronteras.
Ese resultado desfavorable se conserva. Umbral2 en el visor es una simulación local
sobre distancias guardadas, no una captura nueva ni otra evaluación de recuperación.

results/chunking.json conserva tamaño32, semántico32, overlap4 y overlap8: 13/44/14/16
chunks, 367/367/411/471 apariciones de unidades. Incluye87 secuencias del tokenizer.
Los80 rankings BM25 (20preguntas×4) de results/retrieval.json mantienen k1=1.2,b=.75,
analizadorfold y cuerpo sin título. Cambian las estadísticas propias de cada índice.
Gold por hechos/alternativas versionadas,10dev,8test con respuesta y2negativas test;
corpus sintético conocido, no test ciego. No generación, dense search ni reranking.

Auditoría sin pesos, inferencia ni red:

```sh
pnpm --filter @luisrc-examples/document-ingestion verify:chunks
```

Opcionalmente reproducir las44 secuencias de entrada al encoder y87 de chunks:

```sh
node packages/document-ingestion/verify-chunking.mjs --tokenizer
```

La auditoría comprueba hashes, orden de preparación, citas gold, vectores, distancias,
rangos, cobertura y los cuatro índices/rankings. No vuelve a inferir embeddings.
Los comandos de captura rehúsan sobrescribir evidencia. Para otro experimento hay
que versionar protocolo y rutas, mantener el resultado original y volver a fijar gold.

Orden original documentado, NO necesario para leer o auditar:

```sh
pnpm --filter @luisrc-examples/document-ingestion semantic:prepare-model
pnpm --filter @luisrc-examples/document-ingestion chunks:prepare
pnpm --filter @luisrc-examples/document-ingestion semantic:capture
pnpm --filter @luisrc-examples/document-ingestion chunks:derive
pnpm --filter @luisrc-examples/document-ingestion retrieval:capture
```

## Visor y límites de las medidas

Diez paneles: PDF, OCR, layout, HTML, provenance, dedup, tamaño, semántico, overlap y
recuperación. Sin servicios externos ni ejecución de modelos en el navegador. Los
controles operan solo sobre datos guardados, con rango/identidad de fuente visibles.
`render` y `node packages/document-ingestion/render-charts.mjs` derivan el paquete de
datos y ocho figuras SVG; no ejecutan capturas. Se publican solo20 archivos allowlisted
estáticos, sin laboratorios completos, pesos ni ZIPs.

En8preguntas test con respuesta: cobertura .97917/.8125/.96528/1 ycompletitud7/8,6/8,
7/8,8/8. Se conservan Q04(overlap8regresa),Q07(overlap4regresa),Q17(semántico0),
Q18(semánticoyoverlap8mejoran),Q19(3resultadossinrespuesta),Q20(0resultados).
Cobertura de unidades etiquetadas no prueba corrección semántica universal, latencia
ni calidad de respuestas generadas. Negativas quedan fuera de la media y sus métricas
son null. Ver docs/editorial/document-ingestion-review.md para revisión y límites.
