# Glosario de modelos de lenguaje

| Término | Significado en esta serie |
| --- | --- |
| Token | Unidad del tokenizer, no necesariamente una palabra. |
| Vocabulary ID | Índice estable, sin orden de importancia semántica. |
| Embedding | Parámetros que convierten un ID en vector. |
| Activation | Valor intermedio dependiente de la entrada, distinto de un peso. |
| Logit | Puntuación real previa a normalizar clases. |
| Softmax | Distribución normalizada sobre todo el vocabulario. |
| Autoregression | Factorización mediante predicciones condicionadas por prefijos. |
| Teacher forcing | Usar prefijos de referencia al supervisar targets desplazados. |
| Causal mask | Restricción de acceso al futuro, no un peso aprendido. |
| Context window | Límite de posiciones disponibles; no garantiza aprendizaje en todas ellas. |
| Next-token NLL | Negativo del logaritmo de probabilidad del target observado. |
| Perplexity | Exponencial de la NLL media; depende de tokenizer y contexto. |
| Masked LM | Objetivo de recuperar posiciones seleccionadas con entrada corrompida. |
| Cross-attention | Queries de salida consultan keys/values de otra secuencia. |
| Untied head | Proyección de vocabulario independiente del embedding de entrada. |
| Seed | Inicialización/aleatoriedad fijada, no una muestra nueva de documentos. |
