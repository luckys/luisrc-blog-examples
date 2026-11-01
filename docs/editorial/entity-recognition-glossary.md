# Glosario de reconocimiento de entidades

| Término | Uso en esta serie |
| --- | --- |
| NER | Localizar menciones y clasificarlas; no resolver identidad real. |
| Span | Intervalo [start,end) sobre la versión original del texto. |
| Code point | Unidad de offsets elegida; distinta de UTF-16 y grapheme cluster. |
| BIO/IOB2 | B inicia cada entidad,I continúa tipo compatible,O queda fuera. |
| Gazetteer | Catálogo de menciones conocidas con tipo. |
| Token classification | Clase por posición; requiere alinear etiquetas y entrada. |
| Softmax | Convierte logits por token en una distribución sobre clases. |
| Cross-entropy | Objetivo supervisado por token; no es F1 por entidad. |
| Viterbi | Mejor camino legal; aquí transiciones fijas,no CRF entrenado. |
| Subword alignment | Relación entre piezas de tokenizer y palabras anotadas. |
| Ignore index | Posiciones excluidas de la loss; -100 no equivale a O. |
| Exact match | Documento,inicio,final y tipo idénticos. |
| Micro F1 | Sumar TP/FP/FN antes de dividir. |
| Macro F1 por tipo | Promediar F1 de tipos,con política explícita para null. |
| IoU | Solapamiento de intervalos usado solo para diagnóstico. |
| Generalization | Comportamiento fuera del conjunto ajustado,no demostrado por train perfecto. |
