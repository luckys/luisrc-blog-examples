# Attention and Transformer

Laboratorio P103 para ocho artículos en español. Reconstruye atención y bloques
Transformer con pesos inicializados. No entrena modelos ni mide calidad
predictiva, traducción o rendimiento de hardware.

## Reproducir

Desde el monorepo, con Node 24.19+, pnpm 12.8.1 y Docker:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --dir packages/attention-transformer runtime:fetch
pnpm --dir packages/attention-transformer test:container
pnpm --dir packages/attention-transformer verify
pnpm --dir packages/attention-transformer test
```

El runtime CPU está fijado por digest en runtime.json: Python 3.13.17,
NumPy 2.5.4 y PyTorch 2.14.1+cpu, linux/amd64. No instala Python en el host.
El runner limita cada contenedor propio a dos CPUs, 2 GiB y un thread; usa red
none, pull never, rootfs/bind readonly, /tmp temporal, user 1000:100 y cap-drop ALL.
Su timeout es 300 s y solo limpia el nombre aleatorio propio precomprobado.

`exercise` recalcula comparison.json y results/observations.json mediante archivos
.pending y rename; no promete una transacción entre ambas copias. `render` genera
cuatro SVG. `verify` recalcula casos, modelos, controles y gradientes: compara
números con rtol 1e-10/atol 1e-12, diez hashes de fuentes y versiones. No promete
igualdad entre hardware o versiones diferentes.

## Qué se calcula

protocol.json declara float64, ancho 8, dos heads de cuatro componentes, FFN 16,
vocabulario 12, batch dos, seeds 7/19/31 y dropout cero. Hay nueve casos aislados:
self completa de longitud cuatro, self causal de longitud cinco y cross con cinco
queries/cuatro keys, por cada seed. Cada módulo registra 288 parámetros.

Se conservan Q/K/V, scores raw/escalados, allowed, weights, contexto por head,
concat y salida. Se contrastan salida y pesos con SDPA y MHA; también los gradientes
de Q/K/V. En nuestro helper/SDPA, True permite; el adaptador MHA invierte la máscara.
Se rechazan filas sin acceso. El cero que SDPA devuelve para ese caso pertenece al
runtime observado, no se universaliza a cualquier API.

Tres inicializaciones de decoder-only (820 parámetros) y encoder-decoder (1740)
comprueban causalidad end to end, acceso a source válido y aislamiento de padding.
Usan un bloque pre-norm con ReLU, PE sinusoidal, LayerNorm final y head de doce
logits. Encoder-decoder comparte embedding de source/target, pero no lo empata
con la head. No es la arquitectura post-norm exacta del paper de 2017.

## Controles y límites

- Softmax estable con [1000,1001,999]; la forma ingenua resulta no finita.
- 512 queries/ocho keys, componentes normales independientes y dimensiones
  1/4/16/64: dispersión y entropía antes/después de escalar. Entropía no es calidad.
- Máscara invertida: cambio máximo de salida ≈8,01857. Padding de keys no anula
  automáticamente queries de padding.
- PE de posiciones 0…15 y tres permutaciones: sin posición, con posiciones fijas,
  y pares token+posición permutados juntos. No garantiza extrapolación de longitud.
- Bloque pre-norm frente a TransformerEncoderLayer de pesos copiados. Anular
  subcapas conserva el bloque, pero no toda una arquitectura con normalización final.
- Una/dos/cuatro heads a ancho ocho conservan 288 parámetros; no se mide velocidad.
- Futuro target cambiado: prefijos idénticos con máscara. Sin máscara cambian
  ≈0,650188/0,392394/0,527208. Gradiente al futuro y a otra muestra igual a cero.
- Tensor denso de scores B=2, H=2, float64: 512/2048/8192/32768 bytes para
  longitudes 4/8/16/32. No es VRAM total ni un benchmark de kernels fusionados.

Doce tests Python y tres JS. Los contratos se escribieron antes de implementar:
primero fallaron imports ausentes y después pasaron. Los tests distinguen shapes,
convenciones de máscara, valores, gradientes y controles negativos; no interpretan
los fallos iniciales como evidencia numérica de código que aún no existía.

El visor muestra matrices y contribuciones, escala, posiciones y pruebas causales.
Sus 21 combinaciones de seed/etapa incluyen casos aislados y bloques completos.
Pesos en escala 0…1 y cruces para accesos excluidos; gradientes con escala simétrica
local. Las tablas conservan cero y usan notación científica cuando ayuda.
Solo se exportan HTML/MJS/JSON/SVG explícitos, sin Python, checkpoints o servidores.
