# Convolutional networks

Laboratorio de los nueve drafts españoles de P101. Imágenes y tareas sintéticas;
no es un benchmark de visión natural ni un modelo para producción.

## Ejecutar

Desde la raíz del monorepo, con Node 24.19+, pnpm 12.8.1 y Docker:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --dir packages/convolutional-networks runtime:fetch
pnpm --dir packages/convolutional-networks test:container
pnpm --dir packages/convolutional-networks verify
pnpm --dir packages/convolutional-networks test
```

Runtime fijado en runtime.json, reutilizado de los laboratorios anteriores:
Python 3.13.17, NumPy 2.5.4, PyTorch 2.14.1+cpu, linux/amd64, digest de image.
No se usa torchvision, no se instalan paquetes Python en el host ni se descargan
imágenes. `runtime:fetch` solo necesita red si falta la image.

Runner: contenedor propio aleatorio precomprobado, --rm, pull=never, red none,
rootfs/bind readonly, /tmp temporal, user 1000:100, cap-drop ALL, dos CPUs/2 GiB,
un thread Torch/OMP/BLAS/MKL, timeout 300s. Limpia solo ese contenedor.
`exercise` escribe results/training.json y comparison.json usando archivos
.pending y rename; `render` genera las tres figuras a partir del informe.
No se prometen transacciones entre ambas copias ni durabilidad distribuida.

## Protocolo declarado antes de entrenar

protocol.json conserva fuentes de variación y presupuestos. Entrenamiento float32,
probes aritméticos float64. Source: cuatro orientaciones de segmentos, 24×24,
un canal, centros con jitter ±4, semilongitud uniforme [6,10], grosor [1,2],
fondo .05, contraste .85, ruido normal std .035, clip [0,1]. Train 64/clase y
validation 32/clase, seeds 101/102. No hay augmentations en vivo.

Target: mismas orientaciones agrupadas en ejes=0/diagonales=1, fondo .25,
contraste .5, ruido .08, grosor [2,3]. Train 8/orientación y validation
32/orientación, seeds 201/202. Datasets generados una vez, no test final.

TinyCNN: Conv1 1→4/3/p1, ReLU, MaxPool2/2, Conv2 4→8/3/p1, ReLU,
AdaptiveAvgPool1, head lineal. Backbone 336 parámetros; source 372, target 354.
He en convs, Xavier head, bias cero. Source: 40 epochs, batch32, Adam .01,
seeds7/19/31, 320 updates por run. Orden dedicado420 compartido entre seeds.

Target: cuatro modos por seed, 40 epochs/batch16, 80 updates. Scratch y
random_frozen comparten backbone aleatorio; frozen/fine_tune cargan backbone
source desde .pt real temporal. Misma head inicial entre los cuatro modos por
seed. Frozen/random_frozen entrenan solo18 parámetros, backbone eval/no_grad;
fine_tune actualiza todos con lr backbone .001/head .01. Los demás usan .01.
Orden1420 compartido. Selección: último estado, sin retuning posterior.

## Evidencia y límites

15 runs reales:3 source y12 target. Source accuracy validation1 en las tres.
Target accuracy scratch .9609375/.9609375/.9765625, frozen
.515625/.5/.5390625; el informe publica todas las curvas, incluidas random_frozen
y fine_tune. Transfer no gana con este protocolo. No se aísla el efecto de
apariencia, etiquetas y presupuesto. No se retocan para imponer una mejora.

Cuatro imágenes de validation source seleccionadas por regla fija (primera de
cada clase), seed7/epoch40. Cinco etapas completas, medias, logits/probabilidades
y32 mapas de gradiente respecto al input para conv2_pre[:,6,6]. No explican
causalmente la clase. Escala compartida por etapa o contraste local declarado.

Probes: ocho geometrías vs Conv2d; contribuciones por celda; padding asimétrico
right/bottom; max/average pooling, gradientes, padding y desplazamientos;
aliasing checkerboard; suma multicanal y27parámetros; receptive field8/jump2/
start1 y gradiente central9…16/esquina0…4 en operador positivo de referencia.
ResidualBlock educativo ejecutado/testeado, no usado en los15trainings.

Nueve tests Python y tres JS. Contratos primero: fallos iniciales de import de
geometry/networks/model ausentes y después casos verdes. No se los presenta como
fallos numéricos de una implementación que todavía no existía.
`verify` recalcula15trainings,probes,mapas ygradientes; compara números con
rtol1e-6/atol1e-7, hashes de11fuentes, versiones, datasets ylas dos copias JSON.
Además exige updates/epochs/freeze correctos. No exige mejorar por transferir.
No garantiza identidad entre hardware/versiones, calibración, tiempos o robustez.

## Archivos

- geometry.py/probes.py: cálculo manual y contrastes independientes.
- networks.py/training.py: modelo, datos, entrenamiento y capturas.
- experiments.py/verify.py: evidencia reproducible y contraste fresco.
- model.mjs/charts.mjs/explorer.*: presentación local sin API de entrenamiento.
- tests/: contratos de valores, shapes, estados, selección y escalas.

Solo se exportan recursos estáticos explícitos a public/assets/interactive del
blog. Código de laboratorio y checkpoints no se copian allí. El blog incluye
extractos explicados y enlaces a estas fuentes.
