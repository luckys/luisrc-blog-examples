# P113: elegir y combinar señales de recuperación

Estado: siete borradores escritos y verificados. Ver retrieval-strategies-series.json
y retrieval-strategies-review.md. No publicados. La planificación inferior conserva
el contrato previo y se ha materializado en las siete entregas.
Prerrequisitos: P106, P111 y la serie P112 verificada. Español, borradores,
autor Luis Ramírez Calle. Conservar las 175 fichas del objetivo global.

## Desglose propuesto, por una decisión técnica cada vez

| Orden | ID | Pregunta principal | Laboratorio y visualización previstos |
| --- | --- | --- | --- |
| 1 | P113 | Qué recupera BM25 cuando sus documentos son chunks y qué pierde ante una paráfrasis | Baseline léxica fija, términos/scores y trazabilidad hasta la fuente |
| 2 | RETRIEVAL-DENSE | Cómo comparar la consulta con los textos sin mezclar perfiles de embeddings | Embeddings reales de consultas/chunks; coseno exacto y resultados favorables/desfavorables |
| 3 | RETRIEVAL-RRF | Cómo unir BM25 y búsqueda densa cuando sus scores tienen escalas distintas | RRF por posiciones, unión por ID, profundidad de candidatos, empates y contribuciones visibles |
| 4 | RETRIEVAL-FILTERS | Por qué filtrar candidatos antes o después del top k puede devolver conjuntos distintos | Metadata de origen, filtros reproducibles y caso con menos de k resultados; límites frente a ACL |
| 5 | RETRIEVAL-MULTIQUERY | Qué aporta buscar varias formulaciones y qué coste añade | Variantes fijadas antes de evaluar, rankings por consulta, fusión y duplicados |
| 6 | RETRIEVAL-REWRITE | Cómo reformular una consulta sin perder restricciones, entidades o negaciones | Original y rewrite conservados, reglas explícitas y controles que detectan deriva de intención |
| 7 | RETRIEVAL-EVALUATION | Cómo comparar tres retrievers sin elegir ejemplos a posteriori | BM25/denso/híbrido sobre gold, cobertura y completitud top k, casos individuales y negativos |

La explicación de sparse/dense acompaña a las dos primeras entregas; hybrid fusion
y rank fusion se concretan en RRF. Evitar convertir cada post en un resumen de P106
o P111: aquí la pregunta es qué evidencia recibe el lector de un RAG. Si filtros o
rewrite necesitan más espacio, dividir antes de acumular conceptos sin explicar.

Cada entrega tendrá apertura con un problema, mecanismo explicado, decisiones y
alternativas, código inline de fuentes probadas, diagrama conceptual, gráfico de
resultados y/o visor con controles, errores, límites, ejercicio y referencias primarias.
El código del laboratorio estará únicamente en packages/retrieval-strategies del
monorepo de ejemplos cuando se implemente; no crear un paquete vacío para inflar el
catálogo. Los posts enlazarán GitHub y mostrarán también los extractos pertinentes.

## Contrato experimental que debe fijarse ANTES de las capturas

1. Mantener fija una partición del corpus P112: size32, 13 chunks, sin volver a elegir
   chunking por la métrica favorable de overlap8. Documentar que es una baseline,
   sin afirmar que ese tamaño sea óptimo. Preservar todos sus IDs y versiones.
2. Copiar como entrada versionada o referenciar por SHA los textos, gold y origen.
   Las20preguntas P112 ya son conocidas: no llamarlas test ciego ni independiente.
   Si se añaden paráfrasis, fijar etiquetas/variantes y protocolo antes de los nuevos
   embeddings y rankings. No reescribir gold después para favorecer una estrategia.
3. BM25 conserva analizador fold, k1=1.2, b=.75, cuerpo sin títulos añadidos. Búsqueda
   densa usa MiniLM con revisión, dtype, pooling, tokenizer, máscara y longitud
   declarados; inferencia real de queries/chunks, sin vectors inventados ni truncation.
4. Similitud coseno exacta sobre el corpus pequeño. ANN ya tiene otra ficha/serie;
   no añadir otra comparación de índices aproximados que distraiga del retriever.
5. RRF usa posiciones desde1, constante y ventana de candidatos fijadas antes. Unir
   por ID de chunk, no por texto visible. Conservar los rankings de cada señal y cada
   contribución. No sumar scores BM25/coseno como si compartieran escala.
6. Metadata de origen/idioma/tipo con identidad de fuente explícita. Comparar filtro
   sobre conjunto elegible con filtro posterior a top k. Un filtro de tema/tipo no
   constituye autorización: no presentar controles de corpus como un sistema ACL.
7. Multi-query y rewrite deben conservar la consulta original y la procedencia de
   cada variante. Variantes redactadas o reglas deterministas se identificarán como
   tales. No afirmar inferencia de LLM si no se ejecutó uno. Medir búsquedas y tamaños
   de candidatos como contadores; medir latencia aparte si se pretende hablar de ella.
8. Medir evidencia por rangos/versiones/fact alternatives de P112. Negativas con
   cobertura/completitud null y número de resultados explícito. Ningún umbral de
   abstención validado solo con las dos preguntas negativas existentes.
9. Conservar los resultados completos de BM25, denso e híbrido y cualquier regresión;
   no tunear o reintentar para lograr una narración favorable. No simular un resultado
   real con una tabla elegida a mano. Fixtures conceptuales separados de las capturas.

## Evidencia requerida antes de dar esta serie por verificada

Capturas inmutables con hashes de fuentes/modelos/entradas/protocolo/runtime;
verificador independiente de scores, rankings, fusión y métricas; pruebas de reglas,
empates, identidad y filtros; extractos exactos en los posts; recursos públicos
allowlisted sin pesos ni ejecución remota; QA móvil/escritorio con teclado, scroll,
ausencia de desbordamiento y revisión visual de diagramas y gráficos. Build y enlaces
válidos. Sin traducción, audio, publicación, commit ni push automáticos.

## Referencias primarias consultadas para el diseño

- [Elasticsearch: BM25, k1 y b](https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity).
- [Elasticsearch: Reciprocal Rank Fusion](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion).
- [pgvector: documentación del proyecto](https://github.com/pgvector/pgvector), secciones Filtering y Hybrid Search.
- [Ma et al., Query Rewriting in Retrieval-Augmented Large Language Models, EMNLP2023](https://aclanthology.org/2023.emnlp-main.322/).

Estas referencias sostienen los conceptos; las capturas originales y su auditoría
son la evidencia de resultados del laboratorio ya ejecutado. No copiar afirmaciones generales de mejora
de las herramientas como si fueran garantías para nuestro corpus.
