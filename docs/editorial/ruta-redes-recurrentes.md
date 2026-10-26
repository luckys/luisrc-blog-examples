# Ruta de lectura: estados recurrentes y generación

Ocho drafts españoles de Luis Ramírez Calle. Bloque P102, independiente de PaySafe.
Prerrequisitos globales: P099 y P100. Un concepto por post antes de combinarlo con el siguiente.

## 1. P102: Embeddings: convertir símbolos en vectores sin inventar un orden entre sus IDs

[embeddings-tokens-tabla-vectores-padding](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/embeddings-tokens-tabla-vectores-padding.md).

Pregunta: Qué aprende una tabla de embeddings y qué significa seleccionar una fila.

- Distinguir ID de categoría y magnitud numérica.
- Relacionar lookup y one-hot con una matriz aprendida.
- Comprobar gradientes repetidos y el tratamiento de padding.

Errores que debe distinguir: Interpretar la distancia entre IDs como similitud; Dar significado semántico a vectores aleatorios; Confundir un embedding de padding cero con detener la recurrencia.

## 2. DL-HIDDEN-STATE: Hidden state: qué conserva una red entre símbolos y qué aprende entre batches

[hidden-state-recurrencia-estado-pesos](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/hidden-state-recurrencia-estado-pesos.md).

Pregunta: Cómo distinguir el estado de una secuencia de los parámetros compartidos.

- Seguir el estado por una secuencia.
- Distinguir salida por paso y estado final.
- Decidir cuándo reiniciar o conservar estado.

Errores que debe distinguir: Arrastrar estado entre ejemplos independientes; Confundir h_t con pesos aprendidos; Suponer que un vector finito conserva toda la historia.

## 3. DL-SEQUENCE-LENGTHS: Longitudes variables: evitar que padding se convierta en parte de la secuencia

[secuencias-longitudes-variables-padding-packed](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/secuencias-longitudes-variables-padding-packed.md).

Pregunta: Cómo formar batches sin confundir el final real con el último índice rellenado.

- Separar padding del contrato de longitudes.
- Contrastar packed batches con ejecuciones individuales.
- Normalizar una loss enmascarada por elementos válidos.

Errores que debe distinguir: Tomar output[:, -1] con secuencias rellenadas; Suponer que embedding cero congela h_t; Permutar longitudes sin conservar el orden de muestras.

## 4. DL-RNN: RNN con tanh: compartir una transición y entrenarla a través del tiempo

[rnn-tanh-unroll-bptt-memoria](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/rnn-tanh-unroll-bptt-memoria.md).

Pregunta: Cómo funciona una recurrencia simple y qué demuestra un predictor de memoria.

- Reconstruir la transición y el unroll.
- Entender la acumulación temporal del gradiente.
- Leer el presupuesto y resultados del predictor de un bit.

Errores que debe distinguir: Aprender pesos nuevos para cada instante; Afirmar que toda RNN falla con secuencias largas; Confundir menos parámetros con menor coste medido.

## 5. DL-LSTM: LSTM: seguir qué se conserva, qué se escribe y qué se expone

[lstm-cell-state-input-forget-output-gates](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/lstm-cell-state-input-forget-output-gates.md).

Pregunta: Qué cambia al separar cell state y hidden state con puertas aprendidas.

- Reconstruir input, forget, candidate y output.
- Distinguir camino directo de memoria y derivada total.
- Relacionar h_n y c_n con la implementación moderna.

Errores que debe distinguir: Tratar puertas como decisiones booleanas; Garantizar gradiente constante en toda LSTM; Atribuir la forget gate moderna sin matices a la primera publicación.

## 6. DL-GRU: GRU: combinar estado y candidato sin una cell state separada

[gru-reset-update-candidato-convencion-pytorch](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/gru-reset-update-candidato-convencion-pytorch.md).

Pregunta: Cómo actúan reset y update y por qué importa la convención del candidato.

- Reconstruir las dos puertas y la combinación final.
- Contrastar las convenciones de reset antes o después de la matriz.
- Comparar parámetros sin prometer superioridad universal.

Errores que debe distinguir: Confundir reset y update; Intercambiar multiplicación elemento a elemento y producto matricial; Suponer que menos puertas garantiza más rendimiento.

## 7. DL-RECURRENT-GRADIENTS: Gradientes a través del tiempo: perder sensibilidad no equivale a olvidar al predecir

[rnn-vanishing-exploding-gradients-dependencias-largas](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/rnn-vanishing-exploding-gradients-dependencias-largas.md).

Pregunta: Qué significan los productos de Jacobianos y cómo contrastarlos sin forzar un fracaso.

- Calcular controles escalares de contracción y expansión.
- Separar derivada local y memoria en el forward.
- Evaluar longitudes fuera del rango de entrenamiento sin vender un benchmark.

Errores que debe distinguir: Diagnosticar olvido solo por un gradiente pequeño; Creer que clipping recupera gradientes desaparecidos; Ocultar resultados planos porque no encajan en el relato.

## 8. DL-TEACHER-FORCING: Teacher forcing: entrenar con el pasado correcto y generar con el propio

[teacher-forcing-generacion-autoregresiva-evaluacion](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/teacher-forcing-generacion-autoregresiva-evaluacion.md).

Pregunta: Cómo separar el contexto real de entrenamiento del contexto generado en un rollout.

- Desplazar inputs y targets sin filtrar el futuro.
- Evaluar teacher forcing y generación por caminos distintos.
- Declarar alcance de patrones repetidos y perturbaciones artificiales.

Errores que debe distinguir: Usar el target actual como entrada para predecirlo; Afirmar generalización sobre ocho patrones repetidos; Inventar una brecha natural de errores a partir de una perturbación forzada.

## Evidencia requerida

- Predictor recurrente realmente entrenado, con estados/puertas y parámetros rastreables.
- Comparación RNN/LSTM/GRU con presupuesto y diferencias de capacidad declarados.
- Longitudes variables: packed vs ejecución individual, orden de muestras y padding adicional.
- Gradientes: potencias analíticas y trazas del modelo, sin confundir memoria y sensibilidad.
- Generación: targets desplazados, causalidad, masking, contexto real y contexto propio separados.
- Declarar ocho patrones repetidos en ambos splits: no llamarlo generalización.
- Conservar accuracy de los probes de longitud plana a uno y ausencia de brecha final entre recorridos; no retunear el relato.
- Ocho diagramas, cuatro figuras derivadas de arrays y visor dinámico con tablas y escalas explícitas.
- Código completo en recurrent-sequences del monorepo, extractos en los posts, exports canónicos.
- Build, tests editoriales y navegación/layout/teclado/errores a móvil y escritorio.

## Continuación

P103 reconstruye atención y Transformer: Q/K/V, escala, máscaras, multi-head,
posiciones y encoder/decoder. Su laboratorio debe implementar self-attention con
tensores y comprobar dimensiones y máscaras. No se da por hecho con este bloque.
P026, Stripe sandbox P045, soak P058 y los demás gaps siguen abiertos.
Serie02 se mantiene limitada a estructuras de datos y algoritmos.
