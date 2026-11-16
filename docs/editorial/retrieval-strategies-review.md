# P113: siete borradores españoles verificados

Revisión de 2026-11-03. Estado editorial: verified_drafts. Autor Luis Ramírez Calle.
Todos conservan draft true/status draft. No publicados ni traducidos. Código de
laboratorio en packages/retrieval-strategies, fuera del blog. Objetivo global activo.

## Auditoría contra la ficha P113

| Requisito | Evidencia inspeccionada |
| --- | --- |
| Sparse/dense | Posts P113 y RETRIEVAL-DENSE: vocabulario/postings frente a 384 componentes aprendidas; diferencias y límites explícitos |
| BM25 | Implementación P106 reutilizada con fold, k1=1.2 y b=.75; sus veinte rankings coinciden con size32 de P112 |
| Vector | results/embeddings.json: inferencia real de 13 chunks y 20 queries, MiniLM q8 CPU y coseno exacto sobre trece candidatos |
| Hybrid fusion y rank fusion | ranking.mjs, RRF 60/10 por rangos desde uno; identidades, aportes, empates y ventanas conservados en los resultados |
| Metadata filters | 6 casos × 3 métodos × 2 posiciones = 36 resultados; elegibles, corte antes/después y compatibilidad del gold explícitos |
| Multi-query | 7 casos con original y 2 variantes del autor, 21 búsquedas BM25 reales y fusión; no se afirma generación por un LLM |
| Query rewrite | 8 propuestas equivalentes y 8 controles alterados, protección literal y fallback; Q13 alterada supera la regla y se conserva |
| Laboratorio: tres retrievers sobre gold y top k | results/retrieval.json: 60 rankings principales, BM25/denso/RRF, métricas y casos completos; top 3 fijo al evaluar |
| Escritura y continuidad | Siete temas específicos de más de mil palabras, mecanismos, decisiones, alternativas, ejercicios, enlaces y extractos exactos de código probado |
| Diagramas y gráficos | 7 diagramas conceptuales, 7 figuras ECharts, SVG dinámicos de cobertura y contribuciones; 6 paneles del visor |

## Entradas previas y captura real

Entradas fijadas: 2026-11-03T11:33:02.263Z.
Inferencia guardada: 2026-11-03T11:33:16.300Z.
Rankings y controles: 2026-11-03T11:33:40.852Z.

La partición size32 se mantuvo fija desde P112: 13 chunks y 367 unidades de tres
documentos sintéticos conocidos. Se conservan sus IDs, versiones, offsets y gold.
Preguntas ya vistas: 10 dev, 8 test con respuesta y 2 negativas test. No es test ciego.
Las variantes y propuestas del autor tampoco representan un benchmark independiente.

MiniLM multilingüe, revisión2c4055b12046f11709e9df2c122e59ffbdc2f900, q8, CPU,
Transformers.js3.8.1 y ONNXRuntimeNode1.21.0. Atención/máscara y mean pooling con
special tokens activos; 384 dimensiones, sin truncation, límite de trabajo128.
Todos los archivos del modelo se verificaron por SHA antes de inferir. Caché ignorada.
Se preservan los 33 vectores de una única captura; no tuning ni repetición favorable.

El verificador opcional necesitó corregir su adaptación a la salida del tokenizer
de un texto: pasar un array de un texto conserva una dimensión de lote explícita.
Esto no alteró entradas, embeddings, scores ni rankings, ni repitió inferencia.

Fuente y configuración congeladas mediante hashes; lock histórico preservado como
bytes en dependency-lock.capture.json. Los verificadores no reescriben evidencia.
Doce exports estáticos públicos, sin pesos, runtime del modelo ni laboratorio completo.

## Resultados y límites que no deben desaparecer

Test con respuesta (n=8):

| Método | Cobertura | Completitud |
| --- | ---: | ---: |
| BM25 | 0.9791667 | 7/8 |
| Denso | 0.7791667 | 5/8 |
| RRF | 0.8541667 | 6/8 |

Dev (n=10): BM25 cobertura0.9875 y9/10; denso/RRF0.9160714 y8/10. No elegir un nuevo
perfil tras estas métricas. No extrapolar a producción ni afirmar un ganador universal.

Q12: RRF recupera lo que denso cubría solo0.4. Q14: BM25 coloca la evidencia primera,
denso novena y RRF cuarta; queda fuera de top3 en las dos últimas. Q06 yQ18 siguen
incompletas en las tres señales. Q19 devuelve3 sin respuesta en todos; Q20 BM25=0,
denso/RRF=3. Negativas con métricas null y separadas, no calibrar abstención con dos.

F01: BM25 filtra antes de top3 →3 resultados/cobertura1; después →0/cobertura0. En
denso/RRF el filtro posterior deja1/cobertura0.9. F04 tiene gold incompatible y F05
cero elegibles. F06 se mantiene igual. Son rankings exactos y scores globales fijos;
no ejecución nativa de prefilter en ANN, reconstrucción por filtro ni implementación ACL.
En RRF el filtro se aplica sobre su unión ya fusionada, después de ventanas de los hijos.

Multi-query: Q08 pasa de cobertura1 a0; la primera variante además pierde precisión
de intención, explicada en el post. Q18 permanece0.8333. Rewrites: las8 equivalentes
se aceptan,7 alteradas se rechazan y Q13 alterada se acepta con retrieval cobertura1.
Conservar tokens y recuperar evidencia no prueba fidelidad de la transformación.

No respuestas generadas, no ANN nuevo, no latencia ni coste end-to-end medidos. La
ficha P114 debe evaluar respuestas/citas, no sustituirlo por esta misma métrica.

## Verificación ejecutada

- 6 pruebas JS del paquete: coseno, RRF, filtros, protección y gráficos dinámicos.
- verify --tokenizer: 33 secuencias completas, vectores, 60 rankings, 36 filtros,
  7 casos multi-query, 16 propuestas y todas las métricas reconstruidos, sin inferir.
- 245 pruebas editoriales/estructura y 17 del blog pasan. Controlan metadatos,
  extractos, enlaces, catálogos, recursos públicos y conservación de evidencia anterior.
- Chromium completo: /tmp/retrieval-layout.574F2s/report.json. Siete posts a360/1440.
  Por anchura:300selecciones de ranking/k,260pares,320fusiones,36filtros,56subconjuntos
  multi-query y16propuestas. Geometría dinámica contrastada con cifras independientes.
  Seis paneles visibles, teclado y scroll local, sin errores JS ni overflow.
- Siete diagramas y siete figuras sin recortes. Inspección visual de móvil y figuras;
  filtros/rewrite muestran ramas alternativas. SVG dinámicos revisados visualmente.
- Astro compila 50 rutas; Pagefind final indexa 10 páginas, 4280 palabras y 2 idiomas. Los
  borradores permanecen fuera de sitemap, feeds e índice público.

## Continuación global

399 índices por artículo,268 exports,53 laboratorios/54 workspaces. Inventario global:
88draft_exists/19related_only/68not_written, completionProvenfalse. El inventario no
demuestra aceptación de las175fichas. GapsP026/P045Stripe/P058soak ySerie02soloDSA intactos.

Siguiente: P114, ver ruta-reranking-grounding.md. No hay posts ni capturas P114 aún.
P112/P113 siguen sin commit. Últimos commits: blogc2f71c5/examplescc99f36. La petición
de cierre de P111 ya fue cumplida; no inferir permiso de nuevos commits, push,
publicación, traducción ni audio. Servidor propio 525698 cerrado mediante astro dev stop (exit 0). No quedan procesos
  de inferencia, benchmark ni servidor propio de QA pendientes.
