# Glosario de adaptación de modelos

- **Self-supervision:** señal de entrenamiento derivada de la propia observación; puede construir targets sin anotación humana de clases.
- **Denoising:** reconstruir una observación original a partir de una versión corrompida. La corrupción es parte del diseño del objetivo.
- **Pretraining:** fase anterior de entrenamiento. No implica que los pesos resulten mejores para todo objetivo posterior.
- **Transfer learning:** reutilizar algo aprendido en una tarea/distribución para otra. Puede mantener congelado el encoder.
- **Fine-tuning:** actualizar pesos transferidos para un objetivo nuevo. Full tuning y entrenamiento de head no actualizan el mismo conjunto.
- **Linear probe:** clasificador lineal entrenado sobre representación fija; evalúa lo accesible a ese head, no toda la información recuperable.
- **Contrastive objective:** distinguir parejas relacionadas frente a alternativas; positivo y negativo dependen de la definición de la relación.
- **Temperature:** escala de logits previa a softmax. Cambiarla altera la loss incluso si los embeddings permanecen idénticos.
- **False negative:** alternativa tratada como negativa aunque comparta una relación que interesa conservar.
- **Freeze/unfreeze:** impedir/habilitar gradientes de parámetros. El optimizer debe contenerlos para actualizarlos.
- **PEFT:** familia de adaptaciones con pocos parámetros entrenables. No equivale a una medición de toda la memoria o latencia.
- **LoRA:** actualización lineal factorizada de rango acotado, añadida a una matriz base congelada; puede fusionarse bajo los supuestos del artículo.
- **Adapter:** módulo añadido que corrige una representación. El bottleneck con ReLU del laboratorio no se fusiona en general en una matriz constante.
- **Forgetting:** deterioro en una tarea previa al aprender otra; exige evaluar comportamiento, no solo comprobar archivos de pesos.
- **Retention proxy:** medición concreta de una capacidad anterior, aquí reconstrucción con decoder fijo. No representa todas las capacidades.
- **Holdout:** conjunto reservado fuera del ajuste. IDs/hashes de filas prueban disjunción exacta, no toda independencia estadística real.
