# Ruta de lectura: atención y Transformer

Ocho drafts españoles de Luis Ramírez Calle. P103, independiente de PaySafe.
Prerrequisitos: P076, P084, P099 y P102. Pesos inicializados, sin entrenamiento ni benchmark.

## P103: Atención con Q/K/V: consultar y combinar una secuencia sin reducirla a un solo estado

[attention-qkv-consultas-claves-valores](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/attention-qkv-consultas-claves-valores.md).

Pregunta: Cómo una consulta produce una combinación de valores a partir de compatibilidades con claves.

- Reconstruir Q/K/V y la suma ponderada.
- Seguir los ejes de queries, keys y features.
- Distinguir parámetros aprendidos y coeficientes calculados.

Errores: Interpretar atención como búsqueda exacta de un token; Normalizar sobre el eje de queries; Atribuir semántica a pesos sin entrenar.

## DL-ATTENTION-SCALE: Scaled dot-product: por qué dividir antes de softmax y cómo evitar overflow

[scaled-dot-product-attention-softmax-estable](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/scaled-dot-product-attention-softmax-estable.md).

Pregunta: Qué controla la escala del producto escalar y qué no garantiza.

- Relacionar dimensión y escala bajo supuestos explícitos.
- Calcular softmax con desplazamiento estable.
- Interpretar entropía y concentración sin convertirlas en calidad.

Errores: Confundir estabilidad numérica con calibración; Prometer varianza uno sin comprobar los supuestos; Restar el máximo de todo el batch en vez de cada fila.

## DL-ATTENTION-MASKS: Máscaras de atención: no confundir permitido, padding y posición futura

[attention-masks-padding-bool-permitido-excluido](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/attention-masks-padding-bool-permitido-excluido.md).

Pregunta: Cómo traducir una política de acceso a claves sin invertir su significado entre APIs.

- Combinar padding de keys y restricciones causales.
- Contrastar convenciones booleanas y aditivas.
- Definir el caso sin ninguna clave permitida.

Errores: Pasar la misma máscara booleana a APIs con semántica inversa; Suponer que enmascarar keys anula las queries de padding; Multiplicar scores excluidos por cero antes de softmax.

## DL-MULTIHEAD: Multi-head attention: separar perspectivas y volver a reunir sus resultados

[multi-head-attention-split-concat-proyeccion](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/multi-head-attention-split-concat-proyeccion.md).

Pregunta: Qué se divide entre heads y cómo vuelve a producirse un vector por query.

- Seguir reshape, transpose, concat y proyección final.
- Calcular dimensiones y presupuesto de parámetros.
- Contrastar cada head con la implementación nativa.

Errores: Mezclar el eje temporal con el de heads; Prometer más parámetros solo por aumentar heads con ancho fijo; Suponer que cada head aprende una función humana distinta.

## DL-POSITIONAL: Positional encodings: dar coordenadas a una atención que respeta las permutaciones

[positional-encodings-sinusoidales-orden-permutaciones](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/positional-encodings-sinusoidales-orden-permutaciones.md).

Pregunta: Qué aporta la posición y qué cambia cuando se reordenan tokens o pares token-posición.

- Calcular señales sinusoidales por posición y dimensión.
- Contrastar equivarianza sin posiciones.
- Distinguir posición absoluta de invariancia a desplazamientos.

Errores: Confundir equivarianza con salida constante; Prometer extrapolación solo porque la fórmula acepta más posiciones; Permutar tokens y posiciones juntos para probar que el modelo ignora el orden.

## DL-TRANSFORMER-BLOCK: Un bloque Transformer: atención, residual, LayerNorm y FFN resuelven tareas distintas

[transformer-block-residual-layernorm-ffn-pre-norm](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/transformer-block-residual-layernorm-ffn-pre-norm.md).

Pregunta: Qué transforma cada subcapa y dónde se normaliza en el bloque del laboratorio.

- Reconstruir un bloque pre-norm completo.
- Separar mezcla entre posiciones y transformación por posición.
- Contrastar el bloque con una capa nativa de pesos copiados.

Errores: Llamar Transformer a una sola multiplicación de atención; Atribuir pre-norm al bloque post-norm original; Garantizar identidad residual cuando hay una normalización final.

## DL-ENCODER-DECODER: Encoder y decoder: quién consulta a quién en cross-attention

[transformer-encoder-decoder-cross-attention-contexto](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/transformer-encoder-decoder-cross-attention-contexto.md).

Pregunta: Cómo se combinan contexto de origen y prefijo de destino sin filtrar el futuro.

- Distinguir self-attention y cross-attention por origen de Q/K/V.
- Seguir longitudes de origen y destino diferentes.
- Comprobar acceso al origen y aislamiento de su padding.

Errores: Aplicar causalidad al origen como si fuera un target futuro; Tomar K/V del prefijo cuando deberían venir del encoder; Interpretar una salida no entrenada como una traducción aprendida.

## DL-CAUSAL-ATTENTION: Atención causal: demostrar que el futuro no cambia el prefijo

[causal-attention-transformer-futuro-paralelismo](https://github.com/luckys/luisrc/blob/posts-series/src/content/posts/es/causal-attention-transformer-futuro-paralelismo.md).

Pregunta: Qué permite calcular en paralelo una máscara causal y qué sigue siendo secuencial al generar.

- Contrastar invariancia del prefijo y su gradiente al futuro.
- Separar entrenamiento con targets desplazados y generación.
- Contar el almacenamiento cuadrático sin llamarlo un benchmark.

Errores: Usar una máscara como única prueba de ausencia de fuga end to end; Confundir causalidad con ahorro automático de memoria; Interpretar cero fuga como calidad predictiva.

## Criterios verificables

- Q/K/V, ejes y suma ponderada; nueve casos aislados frente a SDPA/MHA.
- Softmax estable y escala bajo supuestos declarados; entropía no es calidad.
- Máscaras booleanas/aditivas, convenciones inversas, padding de keys y filas sin acceso.
- Split/concat/proyección y parámetros a ancho fijo; sin especializaciones semánticas inventadas.
- PE y tres permutaciones distintas, sin garantía de extrapolación.
- Bloque pre-norm frente a EncoderLayer nativa de pesos copiados, residual y LayerNorm por features.
- Encoder/decoder, cross-attention, padding de source y acceso a origen válido.
- Prefijo invariante y gradiente cero al futuro; control negativo sin máscara efectivo.
- Cuatro figuras derivadas de arrays, ocho diagramas, visor, tablas y teclado a móvil/escritorio.

P104 conserva sus requisitos de pretraining, adaptación y test no visto. P105 requiere mediciones GPU reales.
P026, Stripe sandbox P045, soak P058 y los demás gaps continúan abiertos. Serie02 solo estructuras/algoritmos.
