# P111: nueve borradores desarrollados y verificados

Estado vigente: 2026-11-01. Solo español, draft true/status draft,
autor Luis Ramírez Calle. Serie completa como borrador, sin publicación.
Este cierre cubre P111; el objetivo editorial completo sigue abierto.

## Requisitos y evidencia

| Requisito | Entregas y evidencia |
| --- | --- |
| Vector representation | P111: encoder ONNX real, máscara, pooling y representación versionada; results/embeddings.json |
| Cosine/L2/normalization | VEC-COSINE/VEC-L2: controles independientes, float32 y 400 parejas reales |
| Exact/approximate search | VEC-EXACT/VEC-HNSW: recorrido exacto, top-k, frontera y vecinos perdidos |
| HNSW | Estructura, construcción, M/efConstruction/efSearch y Q06 sin mejora conservado |
| FAISS | FlatL2/HNSW nativos, getters efectivos, mapping y probe de serialización/restauración |
| pgvector | Esquema real, SQL parametrizado, opclass, planes Q01 y ef4 devolviendo cuatro de diez |
| BM25/vector etiquetado | VEC-RELEVANCE: veinte documentos y consultas, 40 rankings, dev/test conocidos por el autor, negativos |
| Recall/latency | VEC-MEASUREMENT: 6.600 medidas guardadas, nearest rank, warmup y ámbitos separados |
| Código y didáctica | Inline explicado, GitHub por post, nueve diagramas, seis figuras ECharts y seis paneles interactivos |
| Calidad de entrega | Metadatos, enlaces, archivos canónicos, exports exactos, pruebas y navegador |

## Datos y límites conservados

Encoder capturado el 2026-10-31T09:58:38.974Z: 1.020 textos, 384 dimensiones,
veinte documentos y consultas originales de P106, 980 controles codificados sin gold
semántico. Revisión fijada, q8, CPU, mean pooling enmascarado, máximo 128 tokens.
Ningún texto truncado. Pesos y caches ignorados y fuera del blog.

Relevancia en nueve consultas respondibles de test: BM25 P/R/MRR@3 =
.296296/.833333/.888889; dense = .296296/.777778/.722222. Q12 mejora; Q06 y Q17
regresan; Q19 falla; Q20 carece de respuesta. Sin test ciego, umbral calibrado con
un negativo o afirmaciones de ganador general.

FAISS: siete estrategias, 140 vecindarios, 4.200 peticiones. Índice de mil vectores
unitarios, M4/M16, efConstruction 40, efSearch 4/16/64. El wrapper genérico carece
de setters ef nativos; se usa factory HNSW,Flat y fromBuffer tipado con getters.
El constructor directo sin Flat storage abortó un probe: fallo documentado.

pgvector 0.8.7/PostgreSQL 17.11: 80 vecindarios y 2.400 peticiones. El plan posterior
sin forzar conserva Seq Scan y top-N heapsort. HNSW se ejercita con enable_seqscan=off
e iterative_scan=off. Recall .355/.75/.87; ef4 devuelve cuatro filas. No se midieron
filtros. La versión de representación aporta trazabilidad, no aislamiento automático.

FAISS mide search síncrono, sin encoder/IPC/mapping posterior. PostgreSQL incluye
cliente, serialización, IPC, servidor y parsing, sin SET. Un solicitante, orden fijo,
sin concurrencia ni latencia end-to-end. No se extrapolan percentiles a producción.

## Verificación final

- 15 tests JS de P111 y 51 entre los cinco laboratorios pendientes P107–P111.
- verify.mjs P111 comprueba hashes, 1.020 vectores, 40 rankings, 220 vecindarios,
  6.600 mediciones, distancias independientes, fronteras y planes efectivos.
- Probe nativo anterior: serialización/restauración del índice lleno con dims,
  ntotal, efConstruction, efSearch y búsqueda idénticos. Sin reconstruir benchmarks.
- Verificadores P107/P108/P109/P110 reejecutados: pesos, logits, métricas, trazas y
  contrato Pydantic coinciden. Sin reejecutar relojes para igualar latencias.
- 237 tests de estructura/editorial y 17 del blog pasan. Build Astro: 50 rutas.
  Pagefind: diez páginas publicadas, 4.280 palabras, dos idiomas. Drafts excluidos.
- Chromium final: /tmp/vector-layout.d3DnXh/report.json; helper canónico:
  tools/blog/check-vector-retrieval-browser.mjs. Nueve posts a 360/1440 píxeles.
  Por anchura: 90 controles, 400 parejas/153.600 componentes, 140 casos FAISS y
  1.796 textos, 80 PG y 885 textos, 40 rankings y 430 textos, 231 selecciones de
  medición. Valores contrastados con oráculo independiente; teclado y scroll local.
  Sin errores JS ni overflow. Nueve diagramas y seis figuras sin labels recortados.
  Inspección visual móvil realizada. Planes resumidos legibles y originales accesibles.
- QA focalizado de diagramas: bounding boxes dentro de 360×520, captura PG en
  /tmp/VEC-PGVECTOR-final.png. Ningún servidor de búsqueda expuesto desde el visor.

## Entrega y continuidad

383 índices, 236 exports allowlisted, 51 labs/52 workspaces. El inventario conserva
86 draft_exists/19 related_only/70 not_written y completionProven=false. No demuestra
aceptación de las 175 fichas. Gaps P026 integración, P045 Stripe y P058 soak abiertos.

El usuario solicitó el 2026-11-01 hacer commit de todos los cambios al cerrar esta
serie, incluidos los pendientes anteriores de ambos repositorios. No push ni publicación.
Siguiente P112: parsing, OCR, layout, semantic/size chunking, overlap, metadata,
dedup, provenance e indexing; laboratorio real comparando recuperación de dos estrategias.
