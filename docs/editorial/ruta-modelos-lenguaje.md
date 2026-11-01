# Ruta P108: modelos de lenguaje

Seis drafts en español, autor Luis Ramírez Calle. Prerrequisitos P103 y P106;
P107 no se añade como requisito obligatorio. El objetivo completo sigue abierto.

## Orden de lectura

1. **P108**: Qué predice un modelo de lenguaje: probabilidades, no una única respuesta. Cómo interpretar una distribución condicionada sin confundirla con verdad.
2. **LM-TOKENS**: Tokenizer, embeddings y parámetros: el contrato de entrada de un language model. Cómo conservar IDs y distinguir parámetros de activaciones.
3. **LM-CONTEXT**: Autoregression y teacher forcing: aprender sin mirar el token futuro. Cómo desplazar targets y conservar causalidad al entrenar posiciones en paralelo.
4. **LM-LOSS**: Next-token loss y perplexity: qué miden y cuándo se pueden comparar. Cómo agregar cross-entropy por target y comparar con un baseline.
5. **LM-FAMILIES**: Encoder, decoder y masked LM: separar arquitectura y objetivo. Cómo distinguir familias por visibilidad, fuente y objetivo supervisado.
6. **LM-INSPECTION**: Inspeccionar un language model pequeño sin exagerar lo que aprendió. Cómo auditar las distribuciones guardadas y sus límites experimentales.

## Cobertura y decisiones

P108 explica probabilidad condicional; LM-TOKENS tokenizer, IDs, embeddings y
parámetros; LM-CONTEXT autoregression, contexto y teacher forcing; LM-LOSS
next-token cross-entropy y perplexity; LM-FAMILIES encoder, decoder, encoder-decoder
y masked LM; LM-INSPECTION audita el modelo entrenado y sus límites.

Laboratorio: tres Transformers causales realmente ajustados. Predicciones con
logits y distribución completa en visor y figuras. No sustituye entrenamiento
por conteos. Unigramas son solo baseline. Las otras familias son mecanismos
ilustrados, no modelos entrenados. No sampling en P108: se reserva para P109.

72 frases originales de gramática conocida, 44/14/14, con prefijos/plantillas
compartidos. Captura 2026-10-28T23:24:04.901196+00:00, 3205 parámetros, 21 tokens,
float64 CPU. Se fijaron datos/protocolo antes del ajuste, tres seeds, paso final
fijo y ningún ganador. Siete hashes; no retocar el modelo para favorecer el relato.
El ejemplo de los casi ausente tras «el equipo revisa» hace visible un sesgo del
split, no una regla del español. Perplexity solo comparable con condiciones claras.

Código completo en packages/language-models. Seis SVG conceptuales, tres figuras
medidas y visor con cuatro paneles. Ocho exports allowlisted, sin pesos de modelo.
Ver revisión y glosario. Siguiente ficha: P109, generación y sampling, cuyos
requisitos incluyen streaming/latencia y límites de determinismo; no omitirlos.
