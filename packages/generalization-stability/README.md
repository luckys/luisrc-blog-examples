# Generalization and stability

P100, diez drafts españoles. Laboratorio independiente: no modifica ni importa
fuentes hash de P096–P099. Reutiliza su runtime PyTorch CPU por digest. Código
completo aquí; el blog conserva extractos y exports estáticos permitidos.

## Reproducir desde la raíz

```bash
pnpm --dir packages/generalization-stability runtime:fetch
pnpm --dir packages/generalization-stability test:container
pnpm --dir packages/generalization-stability exercise
pnpm --dir packages/generalization-stability verify
pnpm --dir packages/generalization-stability test
pnpm --dir packages/generalization-stability render
```

La descarga solo hace falta si falta la image ya disponible. Sin pip/conda/uv o
paquetes Python en host. Runner:pullnever,rednone,rootfs/bindreadonly,user1000:100,
capdropALL,2CPUs/2GiB,un thread OMP/BLAS/MKL/Torch. Timeout300s por ejercicio.
Solo crea y elimina su contenedor aleatorio precomprobado; sin prune ocloud.

## Diseño declarado antes de observar resultados

protocol.json:regresión sin(2πx),24posiciones train equiespaciadas[-1,1],ruido
normalσ.25,seed101. Se añade+1.25 al target de índice8 SOLO en train. Validation256
xUniform[-1,1],ruidoσ.25,seed102. No son dos muestras iid sin contaminación; es un
escenario deliberado para memorizar un target alterado. No test final. Grid101
contra señal conocida para ilustrar funciones,no para seleccionar checkpoints.

MLP1→64→64→1,ReLU,float64,4353parámetros. He uniforme en ocultas,Xavier salida,
bias0. AdamWlr.01,full-batch:un update/epoch,máximo2000. Tres seeds7/19/31 por seis
variantes:baseline,dropout.15,decay.01 solo matrices,BatchNorm,LayerNorm y early stopping.
18runs. Inicializaciones lineales emparejadas; normalizaciones añaden256parámetros.
Ninguna variante combina técnicas. Normeps1e-5,BNmomentum.1,antes de ReLU.

Monitor cada10epochs,train/validation en eval yno_grad. onlineMseLast es la loss
del último update,con modo train/máscara/estadísticas de ese forward; no se mezcla
con evaluación a pesos fijos. gradientNormLast corresponde a ese backward.
Historial sin predicciones grandes por paso;snapshots initial/best/last/selected
guardan101predicciones. Norma total de parámetros es diagnóstico,no ranking.

Tracker:mejora estricta,min_delta0,patience10CHECKS=100epochs aquí. Baselines continúan
a2000; early se detiene realmente,restaura deepcopy del state_dict yverifica sus
predicciones. last conserva el último modelo entrenado;selected el restaurado.
No se inventan curvas posteriores ni se sustituye el punto final por el best.

## Resultados negativos preservados

Las tres baselines bajan train yterminan con validation peor que su mínimo
observado. Early mejora el resultado final de seeds7/31,pero en19 se detiene en170,
restaura70 yvalidation.272863 es peor que.205393 del final continuo;la mejora de
la baseline llega más tarde. Dropout empeora las tres comparaciones finales;
decay yBatchNorm mejoran una cada una,LayerNorm otra. Sin tuning posterior.

La expectativa inicial del verificador de que early mejoraría las tres seeds
resultó falsa. Se registró el rechazo,sin cambiar datos,hiperparámetros o duración.
Verify comprueba ahora el contrato que sí debe cumplirse:prefijo idéntico al
continuo,selección del mínimo monitorizado,patience exacta,restauración ylos dos
éxitos/un fallo observados. No identifica una política inadecuada con un bug de copia.

## Controles separados

- Bias/variance:32datasets iid de24puntos SIN outlier,polinomios Legendre1/5/15,
  ridge1e-4. Identidad finita contra señal,variance con divisor32. Ruido esperado
  σ²=.0625,no mínimo obligatorio de una medición finita. No son redes neuronales.
- Initialization:8capas16→16,inputs128×16,seeds303/606. Ceros+ReLU,Xavier+tanh(gain1),
  He+ReLU,normalstd3+tanh. Varianza/segundo momento/gradientes. Saturación solo
  tanh;ReLU tiene null,no cero. Pesos grandes+tanh muestran sensibilidad global
  alta pese a muchas unidades saturadas,no una demostración de vanishing universal.
- Activations:cinco inputs,cuatro funciones,derivadas autograd;ReLU en0 usa0.
  Pre-activation−1,target1:ReLU grad0,Leaky grad no0. Cadenas escalares tanh(3h)/ReLU(3h).
- BN/LN:matrices4×3,primera fila fija,compañeros cambiados,affineFalse. Fórmulas
  manuales,ejes,BNforward varN/runningvarN−1,momentum.1,eval tracked/untracked,
  singleton2D rechazado en train. Entrenamientos sí usan affineTrue.
- Dropout:probe p.2,60000unos,valores0/1.25,media empírica,eval identidad.
  Es otra medición que el entrenamiento p.15.
- Clipping:gradiente[3,4]norm5→≤2,NaN rechazado. Adam con gradrecortado1e-4 ylr.1
  se desplaza≈.09999,no está acotado porητ. Parábola50θ²:lr.05sinclip diverge yguard
  para enstep9;conclip1 acota pasos perooscila;lr.01 resuelve el control. Nunca se
  aplica clipping a los18runs de generalización ni se afirma que cure overfitting.

## Evidencia y límites

Once hashes:fuentes,tests,runner,runtime,protocolo. Dos copias JSON iguales.
Verify reejecuta18runs ycontroles,rtol1e-9/atol1e-11,ypropiedades de trayectorias.
No promesa bit a bit entre hardware/versiones. Datos/grupos/initialization son
fijos:3seeds no equivalen a3datasets ni aintervalos de confianza.

Sin test final,GPU,benchmark,tuning óptimo o ranking universal. BN/LN usan protocolos
concretos,no evalúan tamaños de batch alternativos. El visor selecciona datos
archivados;no ejecuta framework,deserializa modelos ni expone un servicio de control.
