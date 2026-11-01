# P111: representación, geometría e índices por separado

Serie propuesta: Embeddings y recuperación vectorial: de los vectores a la búsqueda.
Prerrequisitos P076/P106/P108. Nueve entregas focalizadas; las nueve están escritas, con revisión final completada.
No aceptar P111 ni el objetivo global por existir su ID en el inventario.

1. **P111**: encoder, tokenizer, mean pooling, máscara, tokens especiales, representación versionada. Borrador escrito.
2. **VEC-COSINE**: producto escalar, dirección, norma, cosine y por qué no es probabilidad. Borrador escrito.
3. **VEC-L2**: distancia/squared L2, normalización y equivalencia con cosine; precisión float32. Borrador escrito.
4. **VEC-EXACT**: búsqueda exhaustiva, IDs, top-k, empates y baseline geométrica. Borrador escrito.
5. **VEC-HNSW**: grafo jerárquico, inserción, M, efConstruction/efSearch, recall y límites. Borrador escrito.
6. **VEC-FAISS**: Flat/HNSW reales, factory frente a wrapper tipado, persistencia y threads. Borrador escrito.
7. **VEC-PGVECTOR**: columna/schema/versiones, operadores/opclasses, plan exacto/ANN, filtro/limitaciones explícitas.
8. **VEC-RELEVANCE**: BM25/vector sobre dataset etiquetado, macro/top3, negativos, mejoras y regresiones.
9. **VEC-MEASUREMENT**: recall geométrico/top10 y latencia; scopes nativo/IPC, warmup, muestras y costes.

No unir cosine con todo HNSW ni dar a FAISS el significado de un algoritmo. La geometría
y la interpretación de métricas necesitan espacio propio. Los ejemplos inline deben
seguir siendo extractos del laboratorio canonical packages/vector-retrieval.

El laboratorio ya capturó1020 embeddings reales,40rankings etiquetados,4200mediciones
FAISS y2400pgvector. No rerun para obtener resultados mejores. Hay regresiones de
relevancia y ANN que pierde vecinos; conservarlas. Nueve posts escritos y seis figuras; las nueve entregas y sus modos del visor están verificados.
El visor tiene controles2D,400parejas reales,140vecindarios FAISS,80pgvector,40rankings semánticos y6600mediciones conservadas. Solo español, drafts, independencia de PaySafe.
