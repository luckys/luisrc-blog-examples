# Glosario de atención

| Término | Uso en el laboratorio | Confusión que evitamos |
| --- | --- | --- |
| Query | Representación que consulta | Una búsqueda exacta obligatoria |
| Key | Representación que se compara | El contenido que se suma directamente |
| Value | Contenido combinado | Un coeficiente de probabilidad |
| Score | Compatibilidad antes de softmax | Peso ya normalizado |
| Attention weight | Coeficiente calculado para esta entrada | Parámetro fijo aprendido por posición |
| Head | Grupo de componentes proyectados | Un fragmento de tiempo |
| Mask allowed | True permite en nuestro helper/SDPA | MHA usa True para excluir |
| Padding key | Columna excluida | Query automáticamente anulada |
| Positional encoding | Coordenada añadida | Garantía de generalización a más longitud |
| Pre-norm | Normalización antes de la subcapa | La disposición post-norm original exacta |
| Cross-attention | Q del destino y K/V del origen | Self-attention con otro nombre |
| Causal | Acceso limitado al contexto disponible | Predicción necesariamente correcta |
| Dense scores | Tensor B×H×L×S | Todo el consumo de memoria del sistema |
