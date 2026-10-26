# Recurrent sequences

Laboratorio P102: ocho drafts españoles. Código completo aquí; el blog conserva
extractos explicados, diagramas y exports estáticos. Dos tareas sintéticas
separadas. No es un benchmark de lenguaje, un servicio stateful o un modelo
para producción.

## Ejecutar

Desde la raíz del monorepo, Node24.19+, pnpm12.8.1 y Docker:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --dir packages/recurrent-sequences runtime:fetch
pnpm --dir packages/recurrent-sequences test:container
pnpm --dir packages/recurrent-sequences verify
pnpm --dir packages/recurrent-sequences test
```

Runtime reutilizado y fijado por digest en runtime.json: linux/amd64,
Python3.13.17, NumPy2.5.4, PyTorch2.14.1+cpu. Sin paquetes Python nuevos en host,
GPU o dataset externo. `runtime:fetch` solo descarga la image si falta.
Runner usa rednone, pullnever, rootfs/bindreadonly, /tmp temporal, user1000:100,
capdropALL, dos CPUs/2GiB, un thread Torch/OMP/BLAS/MKL, timeout300s.
Crea y limpia solo un contenedor aleatorio propio precomprobado.

`exercise` entrena y escribe results/training.json y comparison.json mediante
.pending/rename. No promete transacción entre ambas copias o durabilidad remota.
`render` genera cuatro SVG de las observaciones. `verify` vuelve a entrenar
los12modelos y recalcula controles/trazas/rollouts; tolerancias rtol1e-5/atol1e-7,
doce hashes de fuentes, versiones y hashes de datasets. No garantiza identidad
entre hardware/versiones. No exige que una arquitectura gane a las demás.

## Protocolo previo

protocol.json se escribió antes de entrenar. Memoria: primero1/2 indica clase0/1,
distractores3…6,QUERY7final,PAD0solo almacenamiento. Vocab10,embedding8,hidden16,
una capa unidireccional. Train512/validation256 equilibrados,seeds101/102,
longitudes uniformes4…12. Último checkpoint tras80epochs,batch64,640updates,
Adam.01,clipnorm1,weightdecay0. Evaluación inicial ycada5epochs a pesos fijos.
RNN(tanh)/LSTM/GRU,seeds7/19/31,9runs. Mismos datos yorden420,embedding/head
iniciales iguales por seed; matrices recurrentes no iguales por tener shapes
distintas. Parámetros registrados530/1778/1362,incluida filaPAD que permanece0.

Probes finales:128secuencias equilibradas por longitud4/8/12/24/48/96,
seed1000+longitud. Son diagnósticos fuera del rango de train, no test final usado
para seleccionar modelos. Accuracy1en todos los modelos/seeds/longitudes. No se
fuerza un fracaso de RNN. Solo hay que recordar un bit, no una historia arbitraria.

Trazas: primera secuencia de longitudes12/48 por modelo,18trazas. Tokens,
embeddings,hidden por paso,logits intermedios,puertas reconstruidas con pesos
reales ygradiente del logit final de clase correcta respecto a embeddings.
La head solo se supervisa al final,los logits intermedios son inspección.
La derivada no es respecto al ID entero,una media de población o causalidad.
Norma primerembedding RNN7/long48≈3.198e-22 yaccuracy1coexisten: sensibilidad
infinitesimal ydistinción discreta no son equivalentes. Gate reconstruction se
contrasta con salida nativa,tolerancias explícitas,no una simulación de estados.

Continuación: ciclo de4símbolos,8tokens+EOS,cuatro rotaciones ydos direcciones.
Train128/validation64,seeds501/502. SOLO8patronesposibles,los8enambossplits.
Seeds distintas NO hacen de validation un conjunto de patrones no vistos.
Se archivan trainUnique8/validationUnique8/overlap8. Este control verifica rutas
de ejecución yaprendizaje de un conjunto finito, no generalización.

GRU independiente,head10,1498parámetros,60epochs/batch32/240updates,
Adam.01/clip1,seeds7/19/31,orden1420,3runs. Inputs BOS+targets desplazados.
Loss por token válido,ignorePAD;EOSsícuenta. Prefijo real de2tokens en evaluación;
se evalúan6restantes+EOS. Teacher usa contexto real;rollout usa propioargmax,
sin target futuro como argumento. Se comparan tokenaccuracy yexactmatch.
Tres seedsfinales1en todas. Lossno0: primeros2targets no determinados porBOS.
Perturbar primer token generado es intervención artificial, no tasa natural
medida de errores. Ocho ejemplos archivados por seed,puede haber patrones repetidos.

## Controles y pruebas

Doce tests Python y3JS. Contratos antes de implementar: import failures de
cells/data/model ausentes,después verdes. Celda manual float64 vs RNNCell,
LSTMCell yGRUCell por paso. ConvenciónGRU reset fuera deW_hh+biashh vsantes:
control bidimensional no diagonal,error≈.07862con el intercambio incorrecto.
No se atribuye esa convención exacta a todas las publicaciones/bibliotecas.

Embedding: lookup=onehot×Wenforward,repeticiones acumulan,gradPAD0. Padding:
entrada0noimplicaestadofijo;packedbatch desordenado vsindividual yPADextra
invariante. Targetsdesplazados,causalidad al cambiar sufijo,lossmasked correcta.
Normas analíticas: tanh(a·h),h0=0→a^T,a=.5/1.2;camino fijo f=.99→f^T.
No confundir camino de memoria controlado con derivada total LSTM ni clipping
con recuperar gradientes contraídos.

## Visor y exports

model.mjs seleccionaobservaciones;charts.mjs renderiza;explorer.* no entrenan ni
llamanAPIs. Cuatro secciones con tablas,puertas,estados,embeddings yrollouts.
Cambiar checkpoint cambia métricas históricas; trazas/ejemplos son siempre del
modelo final yse indica. Gráfico de gradiente:log10(max(norma,1e-30));tabla con
valororiginal,ceroincluido. Controlesanalíticosseparados. Las longitudes delplot
están espaciadas como categorías, no distancias temporales iguales.
Solo se exportan HTML/MJS/JSON/SVG canónicos explícitos. Sin .py/.pt/servidores
ni ZIPs dentro del blog.
