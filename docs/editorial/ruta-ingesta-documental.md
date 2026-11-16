# P112: Del documento al índice

Nueve borradores españoles escritos y verificados. Autor: Luis Ramírez Calle.
Todos conservan draft true/status draft. No publicados ni traducidos. Laboratorio
canónico en packages/document-ingestion, fuera del blog.

1. P112: parsing de PDF/HTML, texto digital frente a imagen y contrato de extracción.
2. INGEST-OCR: rasterización, OCR real, coordenadas, confidence y CER.
3. INGEST-LAYOUT: orden de lectura y columnas; límites de las heurísticas conocidas.
4. INGEST-PROVENANCE: IDs, versiones, offsets y trazabilidad hasta página y región.
5. INGEST-DEDUP: igualdad de bytes/texto y revisión de near duplicates sin fusión.
6. INGEST-SIZE: ventanas por unidades y conteo real con el tokenizer, sin truncation.
7. INGEST-SEMANTIC: embeddings reales, distancias adyacentes y un umbral que corta todo.
8. INGEST-OVERLAP: paso, parada, contexto repetido y regresiones de recuperación.
9. INGEST-EVALUATION: cuatro índices BM25, gold versionado y evidencia en top 3.

Las dependencias forman esta secuencia, con P106/P111 como prerrequisitos iniciales.
Cada artículo incluye mecanismo, código probado, diagrama, datos/figuras, visor,
trade-offs, fallos, ejercicio, fuentes oficiales y enlaces al código del monorepo.

La captura original de OCR conserva el defecto del adaptador TSV; una derivación
corregida lo interpreta sin repetir reconocimiento ni reescribir evidencia.
La captura semántica conserva las41distancias y44vectores; el umbral0,35 corta todas.
Las preguntas/gold quedaron fijadas antes de esas inferencias y rankings. Corpus
sintético conocido, no test ciego ni demostración de rendimiento de producción.

Ver document-ingestion-review.md para evidencia requisito por requisito y límites.
P113 será la siguiente serie: retrieval léxico, denso e híbrido. El objetivo de175
fichas y gapsP026/P045Stripe/P058soak siguen pendientes. Serie02soloDSA intacta.
