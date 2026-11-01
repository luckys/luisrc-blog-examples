# Language models: P108 en desarrollo

Transformer causal real entrenado desde cero. Seis artículos en draft, seis diagramas, tres figuras y visor de predicciones guardadas.
No es un modelo preentrenado ni un contador presentado como Transformer.

## Reproducir

```sh
pnpm --filter @luisrc-examples/language-models runtime:fetch
pnpm --filter @luisrc-examples/language-models test
pnpm --filter @luisrc-examples/language-models test:container
pnpm --filter @luisrc-examples/language-models verify
```

Verify comprueba siete hashes y reentrena las tres seeds. Compara pesos, logits,
probabilidades, losses, métricas y controles con rtol 1e-10/atol 1e-12. No reemplaza
la captura. Exercise SÍ reemplaza results/observations.json. Data:prepare regenera
tokenized.json: usarlo explícitamente al cambiar datos, nunca como efecto de instalar.

## Datos y modelo fijados antes del ajuste

72 frases originales de una gramática: 6 sujetos, 3 verbos, 4 objetos. Splits por
combinación: train 44/dev 14/test 14, con plantillas y prefijos compartidos. No es
un test de dominio o gramática desconocida. Vocabulario de train: 21 tokens, con
PAD/BOS/EOS/UNK. Tokenizer Unicode sin normalizar ni lowercase. Teacher forcing:
input ids[:-1], target ids[1:]. Siete targets por frase: 308/98/98 por split.

Embedding 16, posiciones aprendidas hasta 16, un bloque pre-LN, 2 heads de 8,
FFN 32, GELU exacto, dropout cero, final LN y cabeza affine untied. 3205 parámetros.
Solo self-attention causal, sin cross-attention. Float64 CPU, Adam .01, 300 updates
full-batch, seeds 7/19/31, mismo paso final, sin elegir ganador.

Runtime por digest: Python 3.13.17/NumPy 2.5.4/torch 2.14.1+cpu. Contenedor propio
aleatorio, red none, rootfs/bind readonly, cap-drop ALL, user 1000:100, 2 CPU/2 GiB,
un thread y timeout 300 s. No instala Python en el host ni toca otros contenedores.

## Captura observada

2026-10-28T23:24:04.901196+00:00. Loss final train: .546997/.549059/.541999.
NLL test: 1.407849/1.222869/1.425571; perplexity: 4.087155/3.396918/4.160231.
Unigramas de targets train sin contexto: NLL test 2.673023/perplexity 14.483693.
Describe esta gramática, no calidad lingüística general ni calibración.

Cambiar el sufijo con cuatro tokens de prefijo idénticos deja diferencia causal
cero en las tres seeds. Sin máscara, con los MISMOS pesos causales, las diferencias
son 3.110329/1.308724/2.676524. Es un control, NO un masked LM entrenado.

Se guardan pesos, 301 losses, 72 predicciones completas de siete posiciones y
siete probes por seed, con logits y 21 probabilidades. JS verifica distribución
y NLL independientemente. Train accuracy ~.66 no prueba por sí sola un fallo:
hay prefijos con varias continuaciones válidas. No afirmar comprensión, velocidad
o superioridad frente a modelos de otros datasets.

## Artículos y visor

Ver docs/editorial/ruta-modelos-lenguaje.md, language-models-series.json,
language-models-glossary.md y language-models-review.md. Código completo solo aquí.
El blog recibe ocho assets estáticos allowlisted; viewer-data.json omite pesos.

El visor no ejecuta texto libre ni generación. Inspecciona 21 probabilidades de
cada probe y posición guardada, teacher forcing, métricas y permisos de atención.
Top5+resto conserva la masa. Tablas desplazables, notas de alcance explícitas.
Render regenera pack y tres SVG desde la captura; no vuelve a entrenar.

No modificar fuentes con hashes sin preservar/versionar la captura anterior.
El siguiente bloque P109 desarrollará generación y sampling; no están implementados
como inferencia libre en este visor.
