# P112: nueve borradores verificados

Revisión de 2026-11-03. Estado: verified_drafts, no publicación ni aceptación del
roadmap completo. Nueve artículos españoles con autor Luis Ramírez Calle y secuencia
P106/P111 → P112 → OCR → LAYOUT → PROVENANCE → DEDUP → SIZE → SEMANTIC → OVERLAP
→ EVALUATION. La ficha P112 tiene desarrollo y evidencia local para su temario.

## Auditoría de alcance de P112

| Requisito | Evidencia autoritativa inspeccionada |
| --- | --- |
| Parsing | PDFs/HTML originales, Poppler24.08 real, parsing.mjs y results/extraction.json;178palabras digital,110columnas,0scan;5bloquesHTML |
| OCR | Scan rasterizado144DPI/1224×1584; Tesseract.js7/core7/WASM spa real;178palabras,confidence95,CER0/1158caracteres NFC/espacios |
| Document layout | XML por filas mezcla columnas;435ediciones/634; regla conocida x306,y70..700,tolerancia2 →0; no detector general |
| Metadata y provenance | sources.v1.json,ledger/ranges;9fuentes,760unidades con origen; identidad estable,bytes yrepresentación separados; offsetsUTF16 ylocatorsPDF/OCR/HTML/texto |
| Dedup | 8gruposbytes,6texto;aliases conservados;3representantes de corpus;2candidatos Jaccard11/13 solo revisión;controles números/negaciones no fusionados |
| Size chunking | 367unidades;16/32/48 →25/13/9chunks;47secuencias reales deltokenizer, máximos29/52/77;cola conservada ysin truncation |
| Semantic chunking | results/chunk-inputs.json,semantic-embeddings.json,chunking.json;44vectores reales384d;41distancias;umbral0,35 cortatodas;cap32,perfil/revisión/modelSHA fijados |
| Overlap | overlapWindows ypruebas;presupuesto32,overlap0/4/8,paso32/28/24;13/14/16chunks;367/411/471apariciones;parada alfinal evita cola contenida |
| Indexing ylaboratorio comparado | evaluate-chunks.mjs yresults/retrieval.json;4índicesBM25 reales,80rankings;20preguntas/gold fijadas antes;configfold,k1=1.2,b=.75,top3 |
| Diagramas ygráficos | 9SVG conceptuales,8figuras ECharts deterministas;10paneles interactivos con control de umbral/overlap/k solo sobre datos guardados |
| Prosa ycódigo | 9posts >1000palabras,extractos exactos de fuentes probadas,trade-offs,fallos,ejercicio,referencias primarias,byline,draft ylinks comprobados |

## Preservación de evidencia y defectos conocidos

Original OCR:2026-11-01T21:29:56.612Z. TSVsin cabecera causó words=[] en el primer
colector,pero texto/TSV/blocks estaban completos. Se conservan ese JSON ycapture.mjs
con su defecto. ocr-tsv.mjs/derive.mjs producen palabras/cajas desde el mismo TSV y
se contrastan independientemente con blocks. No hubo OCRnuevo para corregirlo.
Checksum conconfidence42.646103 es correcto; el visor no borra palabras por umbral.
Modelo spa tessdata_fast4.1.0,commit65727574dfcd264acbb0c3e07860e4e9e9b22185. El404
inicial de tag anotado se resolvió antes de la descarga/captura. Digest no es firma.

Cada fase nueva tiene protocolo/captura propios. Verificadores contrastan hashes de
fuentes,datos ylock histórico; no modificar archivos congelados para cambiar resultados.
Pesos/modelos en .cache ignorada; solo20exports estáticos allowlisted del paquete.

La inferencia semántica única preservada es2026-11-03T10:56:24.817Z. MiniLMq8CPU,
Transformers.js3.8.1/ONNXRuntimeNode1.21.0,384d,attention-maskmean con special tokens
activos. Las41distancias van .3736273272..1.1112930742, todas mayores que .35. No se
ha retocado umbral,pooling,gold ni capturas tras observar esa degeneración. El visor
simula umbrales sobre distancias guardadas; no repite modelo ni evaluación.

## Resultados favorables y regresiones conservados

Test8conrespuesta: cobertura tamaño.9791667/semántico.8125/overlap4.9652778/overlap8=1;
completitud7/8,6/8,7/8,8/8;redundancia0,0,.03935185,.08434140. Desarrollo10: todas
9/10completas,coberturas.9875,.95,.95,.975. Corpus minúsculo/conocido,no test ciego.
Q04overlap8regresa a.75,Q07overlap4a.5,Q17semántico0,Q18semánticoyoverlap8completan.
Q19devuelve3sinrespuesta en todas;Q20devuelve0. Negativas coverage/complete=null y
fuera de las medias. No se ajustó abstención con esos dos casos.

## Verificación ejecutada

- 17tests JS del paquete, todos pasan.
- verify-chunking --tokenizer: reproduce44entradas y87chunks de tokenizer,41distancias,
  fuentes,rangos,4índices,80rankings ytodas las métricas; sin inferencia nueva.
- 242tests editoriales/estructura y17tests del blog pasan. Control de9drafts,extractos,
  enlaces,392índices/256exports,determinismo de8figuras yconservación de capturas.
- Astro50rutas yPagefind10páginas/4280palabras/2idiomas; los drafts siguen excluidos.
- Chromiumfinal:/tmp/ingestion-layout.OIQj9O/report.json. 9posts a360/1440;poranchura
  289PDF,712OCR,303layout,2HTML,1511rangos,14grupos,2near,47ventanas,41fronteras,
  43ventanasoverlap y400selecciones pregunta/estrategia/k. Comparaciones independientes.
  Diez paneles visibles sin overflow,controles nuevos por teclado,scroll local y0JSerrors.
  9diagramas/8figuras sin recortes; inspección visual móvil realizada,incluidos3paneles nuevos.

Estos controles prueban el ensayo declarado, no calidad universal de OCR/embeddings,
coste de producción,latencia end-to-end ni corrección de respuestas generadas. No se
ha comparado aquí un retriever léxico con otro denso; eso corresponde a P113.

## Continuación global

392índices,256exports,52labs/53workspaces. Inventario87draft_exists/19related_only/
69not_written; completionProvenfalse. El objetivo de completar las175fichas sigue sin acreditarse, incluidos
gapsP026/P045Stripe/P058soak. La existencia de un draft no sustituye auditoría de temario.
P112sincomitear. Últimos commits blogc2f71c5/examplescc99f36 cierran P111; no asumir
autorización para futuros commits,push,publicación,traducción oaudio.
