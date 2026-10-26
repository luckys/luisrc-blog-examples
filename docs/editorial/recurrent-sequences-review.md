# Revisión P102: estados recurrentes y generación

Ocho drafts españoles de Luis Ramírez Calle, independientes de PaySafe. Ver
[ruta](ruta-redes-recurrentes.md), [manifiesto](recurrent-sequences-series.json)
y [glosario](recurrent-sequences-glossary.md). P101 se conserva junto a P102 sin
commit. Últimos commits explícitos: blog `b7d32df`, ejemplos `7de597d`.
No hay publicación, traducción o audio nuevos.

## División y cobertura

| Artículo | Contrato explicado | Evidencia |
| --- | --- | --- |
| P102 | IDs, embeddings y PAD | Lookup frente a one-hot, repeticiones y gradiente de padding |
| DL-HIDDEN-STATE | Estado frente a parámetros | Transición, estado final y reinicio por muestra |
| DL-SEQUENCE-LENGTHS | Pasos válidos de un batch | Packed frente a individual, orden y padding extra |
| DL-RNN | Tanh, unroll y BPTT | Celda manual y predictor de un bit entrenado |
| DL-LSTM | Cell state y puertas modernas | Estados y ecuaciones contrastados por paso |
| DL-GRU | Reset, update y convención | Caso bidimensional que rechaza intercambiar reset y matriz |
| DL-RECURRENT-GRADIENTS | Sensibilidad y memoria | Potencias analíticas, normas reales y probes de longitud |
| DL-TEACHER-FORCING | Contexto real frente a propio | Desplazamiento causal, rollout y perturbación artificial |

La división se decidió antes de escribir: una pregunta concreta por pieza,
aproximadamente 1000–1330 palabras con código y metadatos. Ocho extractos Python
coinciden con fuentes y tests ejecutados. Ocho diagramas D2/SVG, cuatro figuras
estáticas y visor de cuatro secciones. Cada post conserva explicación del
mecanismo, decisiones, límites y ejercicio. No hace falta otra subdivisión de
estos focos. Código completo en `luisrc-blog-examples/packages/recurrent-sequences`.

## Predictor de memoria y resultados a distancia

Protocolo declarado antes de entrenar. Primero 1/2 indica etiqueta 0/1, después
hay distractores 3…6 y QUERY=7 al final. PAD=0 solo completa almacenamiento.
Train512 y validation256 equilibrados, seeds101/102, longitudes4…12. Vocabulario10,
embedding8, hidden16, una capa unidireccional. Estado inicial cero por secuencia.

RNN/LSTM/GRU, seeds7/19/31: nueve runs. 80epochs, batch64,640updates por run,
Adam.01, clipping global1, weight decay0. Datos y orden420 compartidos; embedding
y head iniciales iguales por seed. Matrices recurrentes con shapes diferentes,
no se presentan como pesos iguales. Parámetros registrados530/1778/1362;
la fila PAD está incluida en esa cuenta y permanece cero.

Evaluación inicial y cada cinco epochs a pesos fijos, eval/no_grad. Se conserva
el último checkpoint, sin selección de mínimo por validation. Probes finales de
128muestras equilibradas por longitud4/8/12/24/48/96, seed1000+longitud. Todos los
modelos y seeds obtienen accuracy1. El resultado se conserva sin retunear para
forzar que RNN falle. Recordar un bit no equivale a representar toda una historia.
Los probes son diagnósticos de este generador, no un test final de otra aplicación.

Trazas del primer ejemplo por longitud12/48 y modelo:18trazas con tokens,
embeddings, hidden por paso, logits, puertas reconstruidas y normas de gradiente.
La head solo se supervisa al final; los logits intermedios son inspección.
Los estados reconstruidos se contrastan con los nativos dentro de tolerancias.

Norma del gradiente del logit correcto respecto al primer embedding, seed7 y
longitud48: RNN3.1983556e-22, LSTM3.5677181e-7, GRU1.9402565e-4. Accuracy1 en los
tres casos. Sensibilidad infinitesimal alrededor de un vector no equivale a
sustituir un ID discreto por otro. No se deduce olvido del forward de una norma
pequeña, ni un ranking general de arquitecturas de una traza.

## Generación y alcance de sus datos

Otra GRU independiente, head10,1498parámetros. Ciclo de cuatro símbolos, ocho
tokens más EOS: cuatro rotaciones por dos direcciones, SOLO ocho patrones.
Train128/validation64, seeds501/502. Los ocho patrones aparecen en ambos splits:
trainUnique8,validationUnique8,overlap8. El informe lo registra y los tests lo
comprueban. Seeds diferentes no hacen que validation contenga patrones nuevos.
Se verifica aprendizaje de un conjunto finito y rutas de ejecución; no se afirma
generalización de lenguaje ni de secuencias desconocidas.

Tres runs, seeds7/19/31,60epochs,batch32,240updates,Adam.01,clip1,orden1420.
Inputs BOS+targets desplazados. Loss por token válido, PAD excluido y EOS incluido.
Los dos primeros símbolos se proporcionan como prefijo en evaluación. Teacher
usa el token previo real; rollout solo recibe prefijo y consume sus propios
argmax. Se comparan seis símbolos siguientes más EOS.

Al finalizar, teacher token accuracy, rollout token accuracy y exact match son1
en las tres seeds. Las curvas sí muestran diferencias durante aprendizaje; no se
afirma ausencia de brecha durante todo el entrenamiento ni se atribuye su causa
sin un control adicional. Loss validation final≈.2366–.2389: los primeros símbolos
no quedan determinados por BOS, aunque la continuación condicionada sea perfecta.

Ocho ejemplos de validation por seed, con posibles patrones repetidos. Una
perturbación cambia a propósito el primer token generado y después deja correr
el modelo. Se distingue de un error espontáneo o una medida de su frecuencia.
En seed7/prefijo[1,4], esperado[3,2,1,4,3,2,9]; al imponer4 genera
[4,3,2,1,4,3,2] dentro del límite. Las predicciones ausentes no se rellenan como aciertos.

## Controles independientes y convenciones

- Celda manual float64 frente a RNNCell, LSTMCell y GRUCell en tres pasos.
- GRU: reset después de la transformación recurrente, incluida su bias, según
  PyTorch. Moverlo antes de la matriz da error máximo .07862171725958911 en el
  control bidimensional no diagonal. No se intercambian convenciones.
- LSTM: input/forget/candidate/output y h/c. La fórmula moderna no se atribuye
  sin matices a la primera publicación de 1997. El camino directo no es toda
  la derivada cuando las puertas también dependen de estados anteriores.
- Entrada cero no fija el estado: .2→.800499→.885406→.894240→.895122 en el control.
- Packed batch desordenado frente a ejecuciones individuales; PAD extra no
  cambia logits. Longitudes cero o fuera de rango se rechazan.
- Lookup=onehot×W en forward; símbolos repetidos acumulan gradiente y PAD no.
- Desplazamiento de targets, causalidad al alterar un sufijo y loss masked con
  siete tokens válidos. El rollout no recibe targets futuros como argumento.
- Controles analíticos tanh(a·h),h0=0: derivada a^T con a=.5/1.2. A96pasos,
  1.2621774e-29 y39939223.8243. Camino fijo c_t=.99c_prev: .3810471181.
  Este último no se presenta como una LSTM entrenada o su derivada total.

## Reproducción y comprobaciones

Captura final2026-10-25T22:14:53.211252+00:00. Runtime CPU fijado por digest:
Python3.13.17,NumPy2.5.4,PyTorch2.14.1+cpu,linux/amd64. Dos CPUs/2GiB,un thread,
rednone,pullnever,rootfs/bindreadonly,/tmp temporal,user1000:100,capdropALL,
timeout300s. Limpieza solo del contenedor aleatorio propio precomprobado.
Sin paquetes Python nuevos en host, dataset externo, GPU o checkpoints exportados.

Doce hashes de fuentes/tests/protocolo/runtime/runner, hashes de datos y dos
copias JSON idénticas. Verify volvió a entrenar12modelos y recalcular estados,
gradientes, celdas y rollouts con rtol1e-5/atol1e-7. No promete identidad entre
hardware/versiones. No exige que una arquitectura gane para considerar correcto
el cálculo.

Doce tests Python y3JS pasan. Contratos antes de implementaciones: fallos de
import de cells/data/model ausentes, después verdes. No se consideran fallos
numéricos de una implementación que aún no existía. Pasan184checks editoriales/
estructurales y19tests blog. Frozen pnpm install43proyectos;42labs,311índices,
150exports, sin dependencias nuevas o cambio de lockfile. Build50rutas;
Pagefind10páginas/4280palabras/dos idiomas. Drafts excluidos de publicación.
Inventario77draft_exists/19related_only/79not_written: existencia, no aceptación global.

## Navegador y revisión visual

Chromium final18vistas en1440/360px. Por ancho:36checkpoints,90filas de embedding,
108selecciones de estado,18selecciones de celda manual,24ejemplos generativos,
curvas completas, tablas, selectores, coordenadas, teclado, scroll interno,
links, iframe y error404. Sin errores JS ni overflow global. Informes:

- `/tmp/recurrent-sequences-layout.OV7pnE/report.json` (1440px).
- `/tmp/recurrent-sequences-layout.LFpAUy/report.json` (360px).

Inspección visual de ocho diagramas y cuatro figuras, controles de LSTM/GRU,
gradientes RNN y generación. `/tmp/recurrent-sequences-visuals/report.json`.
Figuras≤380px y fuente14en plots, escalas explícitas. Gradientes en log10 con
suelo declarado1e-30; valores originales en tablas, ahora con notación científica
para magnitudes pequeñas/grandes, conservando cero y ausente como casos distintos.

La primera ejecución móvil detectó un bloque MathML de cuatro definiciones en
una línea: scrollWidth375con viewport360. Se separaron las ecuaciones, sin
ocultar overflow o relajar el criterio. Revisión posterior: scrollWidth350 en
los ocho artículos. Se corrigió también el diagrama de hidden state para que
símbolo actual y estado anterior entren por ramas distintas; GRU muestra el
camino directo del estado, y teacher forcing las alternativas de contexto.

## Continuación

P103: Q/K/V, escala, máscaras, multi-head, posiciones, encoder/decoder y causalidad.
Requiere implementar self-attention con tensores y comprobar dimensiones y
máscaras. Separar preguntas antes de redactar; usar referencias primarias y
probes que rechacen fuga del futuro, convenciones de máscara equivocadas y
normalizaciones sobre ejes incorrectos. Mantener código completo en el monorepo.
P026, Stripe sandboxP045, soakP058 y otros gaps permanecen abiertos. Serie02solo
estructuras/algoritmos. El objetivo completo sigue activo; no hay commit/push automáticos.
