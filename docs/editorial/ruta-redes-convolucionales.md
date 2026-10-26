# Ruta de lectura: redes convolucionales

Nueve drafts en español de Luis Ramírez Calle. P101 del roadmap, independiente de PaySafe.
Prerrequisitos globales: P085, P099 y P100. Un mecanismo por artículo antes de combinarlo en la CNN.

## 1. P101: Convolution y kernels: calcular una CNN ventana a ventana

[cnn-convolution-kernel-cross-correlation](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/cnn-convolution-kernel-cross-correlation.md).

Pregunta: Qué se multiplica en una convolution y qué se comparte al recorrer la imagen.

- Reconstruir una salida como suma de productos.
- Distinguir convolution matemática y cross-correlation.
- Explicar qué aprende el kernel y qué decide la arquitectura.

Errores que debe distinguir: Invertir el kernel al contrastar con Conv2d; Confundir una salida con un kernel; Atribuir significado semántico a un filtro sin comprobarlo.

## 2. DL-CONV-GEOMETRY: Padding, stride y dilation: calcular el tamaño y la posición de cada salida

[cnn-padding-stride-dilation-shapes](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/cnn-padding-stride-dilation-shapes.md).

Pregunta: Cómo anticipar el tamaño y las coordenadas sin ensayar tensores al azar.

- Calcular el kernel efectivo y el tamaño de salida.
- Distinguir avance de ventana y separación entre muestras.
- Elegir padding y reconocer sus efectos de borde.

Errores que debe distinguir: Suponer que same funciona con cualquier stride; Contar los huecos de dilation como pesos nuevos; Añadir padding simétrico a un kernel par para conservar tamaño.

## 3. DL-POOLING: Pooling: qué información conserva y qué pierde una CNN al reducir un mapa

[cnn-pooling-downsampling-gradientes-aliasing](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/cnn-pooling-downsampling-gradientes-aliasing.md).

Pregunta: Qué cambia al sustituir una región por su máximo o su media.

- Calcular max y average pooling y sus gradientes.
- Identificar pérdida de posición y aliasing.
- Distinguir las convenciones de padding de cada operación.

Errores que debe distinguir: Prometer invariancia ante cualquier desplazamiento; Rellenar max pooling con ceros sobre entradas negativas; Ignorar el divisor de average pooling junto al borde.

## 4. DL-RECEPTIVE-FIELD: Receptive field: qué parte de la imagen puede afectar a una activación

[cnn-receptive-field-soporte-gradientes](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/cnn-receptive-field-soporte-gradientes.md).

Pregunta: Cómo relacionar una celda profunda con coordenadas de la imagen original.

- Derivar tamaño, salto y centro del soporte teórico.
- Separar soporte teórico de gradiente local.
- Reconocer padding y agregación global en los límites.

Errores que debe distinguir: Identificar receptive field con importancia para la clase; Confundir salto espacial y tamaño del soporte; Contar padding como píxeles observados.

## 5. DL-CONV-CHANNELS: Canales y filtros: cómo una convolution combina varios mapas

[cnn-canales-filtros-parametros-compartidos](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/cnn-canales-filtros-parametros-compartidos.md).

Pregunta: Qué significa un banco de filtros y de dónde salen sus parámetros.

- Sumar contribuciones de todos los canales de entrada.
- Calcular parámetros y shapes NCHW.
- Explicar los supuestos del weight sharing.

Errores que debe distinguir: Crear un bias por posición de salida; Asignar un canal de salida independiente por canal de entrada; Confundir compartir pesos con perder toda información espacial.

## 6. DL-CNN-TRAIN: Entrenar una CNN pequeña: datos, logits y un protocolo que se puede repetir

[cnn-pequena-entrenamiento-protocolo-logits](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/cnn-pequena-entrenamiento-protocolo-logits.md).

Pregunta: Cómo pasar de operadores aislados a un clasificador entrenado verificable.

- Construir datasets separados y declarar el presupuesto.
- Recorrer la arquitectura hasta logits y CrossEntropyLoss.
- Leer curvas sin extrapolar un dataset sintético a imágenes reales.

Errores que debe distinguir: Aplicar softmax antes de CrossEntropyLoss; Escoger después el ejemplo que mejor sale; Tomar accuracy perfecta como prueba de visión general.

## 7. DL-FEATURE-MAPS: Feature maps: inspeccionar una CNN sin inventar lo que ha aprendido

[cnn-feature-maps-activaciones-interpretacion](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/cnn-feature-maps-activaciones-interpretacion.md).

Pregunta: Cómo leer activaciones reales conservando coordenadas, signos y escalas.

- Capturar mapas antes y después de ReLU sin alterar el forward.
- Comparar mapas con escala compartida y local.
- Separar activación, gradiente y explicación de la predicción.

Errores que debe distinguir: Comparar brillo entre mapas autoescalados; Llamar detector de una clase a un canal por una imagen; Interpretar un gradiente nulo como irrelevancia global.

## 8. DL-CNN-ARCHITECTURES: Arquitecturas CNN: qué cambia al apilar kernels o añadir un residual block

[cnn-arquitecturas-vgg-resnet-residual-blocks](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/cnn-arquitecturas-vgg-resnet-residual-blocks.md).

Pregunta: Qué decisiones estructurales hay detrás de distintas familias de CNN.

- Comparar una cadena local con stacks pequeños y shortcuts.
- Implementar una suma residual con shapes compatibles.
- Distinguir un bloque didáctico de una arquitectura entrenada completa.

Errores que debe distinguir: Sumar tensores de canales o resolución diferentes; Prometer gradiente constante por añadir un shortcut; Presentar dos kernels pequeños como equivalentes a uno grande.

## 9. DL-TRANSFER-LEARNING: Transfer learning en una CNN: comparar freeze, fine-tuning y empezar de cero

[cnn-transfer-learning-freeze-fine-tuning-controles](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/cnn-transfer-learning-freeze-fine-tuning-controles.md).

Pregunta: Cuándo una representación aprendida ayuda en otra tarea y cómo comprobarlo.

- Reutilizar un backbone conservando una head nueva.
- Separar freeze, eval y no_grad con controles reales.
- Comparar cuatro alternativas sin garantizar una mejora por transferir.

Errores que debe distinguir: Congelar pesos sin definir el modo de las capas; Confundir pretraining con pesos aleatorios congelados; Atribuir la diferencia observada a una sola causa no aislada.

## Criterios de aceptación

- Reconstruir una celda y contrastar las ocho geometrías con PyTorch, incluidos padding y dilation.
- Contrastar pooling y gradientes, muestreo, padding y efectos de posición sin prometer invariancia.
- Calcular size, jump y start; contrastar centro y esquina con un operador positivo de referencia.
- Sumar contribuciones multicanal y contar parámetros/shapes.
- Entrenar tres CNN source de 372 parámetros y conservar curvas completas.
- Capturar cinco etapas reales en cuatro imágenes seleccionadas por regla fija; escalas explícitas.
- Probar un residual block, incluida proyección y caso post-ReLU. No confundirlo con el modelo entrenado.
- Entrenar doce alternativas target, con controles scratch/random_frozen/frozen/fine_tune; conservar resultados desfavorables.
- Nueve diagramas, tres figuras derivadas del informe y visor con tablas, coordenadas y manejo de errores.
- Reproducción fresca de quince runs; tests de fuentes, contenido, navegación y layout móvil/escritorio.

## Qué continúa pendiente

P102: RNN, LSTM y GRU con embeddings, longitudes variables y dependencias largas.
P104 ampliará pretraining/adaptación; este bloque no sustituye sus requisitos de test no visto y PEFT.
P026, Stripe sandbox P045, soak P058 y los demás gaps del roadmap permanecen abiertos.
Serie02 se mantiene limitada a estructuras de datos y algoritmos.

P102 se desarrolla en la [ruta de redes recurrentes](ruta-redes-recurrentes.md), con ocho preguntas específicas y dos tareas entrenadas.
