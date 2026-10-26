# Glosario CNN

| Término | Significado en esta serie | Confusión que evitamos |
| --- | --- | --- |
| Kernel | Pesos espaciales de una pareja de canales | Una celda de salida no es otro kernel |
| Cross-correlation | Ventanas sin invertir el kernel | La convolution matemática sí lo invierte |
| Stride | Avance del origen de ventana | No separa pesos dentro de la ventana |
| Padding | Extensión definida fuera de la entrada | No son observaciones reales |
| Dilation | Distancia entre muestras vecinas del kernel | Los huecos no añaden pesos |
| Pooling | Resumen espacial por canal | No garantiza invariancia general |
| Receptive field | Soporte posible desde la arquitectura | No equivale a importancia causal |
| Jump | Separación de centros en coordenadas de entrada | No es tamaño del soporte |
| Feature map | Respuestas espaciales de un canal en una etapa | No implica una clase semántica |
| Backbone | Transformaciones reutilizables anteriores a la head | Su contrato incluye preprocesado y modos |
| Head | Capa que adapta representación a logits de la tarea | No conserva necesariamente las clases source |
| Frozen | Backbone sin parámetros actualizados | No activa eval automáticamente |
| Fine-tuning | Actualizar pesos previamente entrenados | No garantiza superar scratch |
| Random frozen | Representación aleatoria fija con head entrenada | No se etiqueta como pretraining |
| Residual block | Suma de rama y shortcut compatibles | Nuestro bloque devuelve ReLU(x) con rama cero |
