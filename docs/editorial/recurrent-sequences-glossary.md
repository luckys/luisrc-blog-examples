# Glosario de secuencias

| Término | Qué significa aquí | Qué no inferimos |
| --- | --- | --- |
| Embedding | Tabla aprendida por ID | Distancia semántica por inicialización |
| Hidden state | Estado que la transición calcula por paso | Un parámetro distinto por secuencia |
| Cell state | Estado interno adicional de LSTM | Memoria ilimitada o gradiente constante |
| Unroll | Grafo de aplicaciones con pesos compartidos | Pesos nuevos por instante |
| BPTT | Propagación por el grafo temporal | Actualizar pesos en cada símbolo necesariamente |
| Padding | Relleno de almacenamiento | Un token real que se deba predecir |
| Packed sequence | Representación de los pasos válidos de un batch | Una máscara de atención |
| Forget/input/output | Puertas modernas de LSTM | Decisiones booleanas |
| Reset/update | Puertas de GRU | Fórmulas intercambiables entre frameworks |
| Vanishing gradient | Contracción de señal local hacia pasos anteriores | Fallo inevitable del forward |
| Teacher forcing | Usar el token previo real | Generación libre evaluada |
| Rollout | Consumir predicciones propias tras un prefijo | Contexto futuro correcto disponible |
| EOS | Símbolo real de final | PAD excluido de loss |
| Exact match | Todos los tokens de continuación correctos | Accuracy por token equivalente |
| Probe de longitud | Diagnóstico de este generador | Test final representativo de otra tarea |
