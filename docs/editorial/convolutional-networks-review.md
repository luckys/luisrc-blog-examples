# Revisión P101: redes convolucionales

Nueve drafts españoles de Luis Ramírez Calle, independientes de PaySafe. Ver
[ruta](ruta-redes-convolucionales.md), [manifiesto](convolutional-networks-series.json)
y [glosario](convolutional-networks-glossary.md). Últimos commits explícitos:
blog `b7d32df`, ejemplos `7de597d` (P098–P100). Este bloque queda sin commit,
publicación, traducción o audio nuevos. El turno anterior fue progreso: confirmó
los dos commits y ambos worktrees limpios antes de empezar P101.

## División y cobertura del roadmap

| Artículo | Mecanismo | Evidencia |
| --- | --- | --- |
| P101 | Convolution, kernel y cross-correlation | Primera salida9, kernel asimétrico y suma por ventana |
| DL-CONV-GEOMETRY | Padding, stride y dilation | Ocho geometrías,112celdas y términos con coordenadas |
| DL-POOLING | Máximo/media, gradiente y downsampling | Valores, derivadas, bordes, desplazamiento y aliasing |
| DL-RECEPTIVE-FIELD | Size, jump, start y soporte | Referencia positiva central8×8/esquina5×5 |
| DL-CONV-CHANNELS | Suma multicanal y weight sharing | Referencia manual vs Conv2d y parámetros27/372/354 |
| DL-CNN-TRAIN | CNN pequeña entrenada | Tres runs source, curvas y contrato logits/targets |
| DL-FEATURE-MAPS | Activaciones reales y escalas | Cuatro imágenes,112mapas y32gradientes de entrada |
| DL-CNN-ARCHITECTURES | Stacks pequeños y residual blocks | Proyección, shapes, suma incompatible y caso post-ReLU |
| DL-TRANSFER-LEARNING | Scratch, random frozen, freeze y fine-tune | Doce runs target, serialización real y estado congelado |

Se dividió antes de escribir para separar mecanismos espaciales, entrenamiento,
lectura de mapas y decisiones de arquitectura/transferencia. Unas1109–1451palabras
por pieza, incluidos metadatos, código y reproducción; preguntas, decisiones,
trade-offs, fallos, ejercicio y límites propios. No hace falta otra subdivisión
de estos focos. P102 y P104 conservan sus requisitos particulares.

Nueve extractos Python coinciden con fuentes ejecutadas. Nueve diagramas D2/SVG,
tres figuras estáticas y visor dinámico en cinco secciones. Las curvas y mapas
se generan de los mismos arrays archivados. Residual muestra dos ramas reales
hasta la suma; no una cadena lineal que esconda el shortcut.

## Protocolo declarado y resultados

`packages/convolutional-networks` no importa ni modifica fuentes hash P096–P100.
Imágenes procedurales24×24,un canal,float32. Cuatro orientaciones de segmentos,
centros con jitter±4,semilongitud uniforme[6,10],longitud total12…20. Source:
fondo.05,contraste.85,ruido normalstd.035,grosor[1,2],clip[0,1]. Train64/clase=256,
validation32/clase=128,seeds101/102. Datos fijos, sin augmentations en vivo.

TinyCNN: Conv1 1→4,k3,p1;ReLU;MaxPool2/s2;Conv2 4→8,k3,p1;ReLU;GAP;Linear.
Backbone336parámetros,headsource36,total372. He convs/Xavier head,bias0. Adam.01,
40epochs/batch32/320updates,source seeds7/19/31. Orden dedicado420 compartido.
Se evalúa epoch0 ydespués de cada epoch a pesos fijos,eval/no_grad. Último modelo,
sin selección por validation, test final o retuning posterior.

Source lossvalidation final7/19/31:
.006116589996963739/.006876328960061073/.00791929755359888;accuracy1 en las tres.
No implica calibración, robustez o reconocimiento de fotografías.

Target: etiquetas ejes=0/diagonales=1, fondo.25,contraste.5,ruido.08,grosor[2,3].
Train8/orientación=32,validation32/orientación=128,seeds201/202,clases equilibradas.
Cuatro modos por seed,40epochs/batch16/80updates,orden1420. Head18parámetros,
total354. Head inicial idéntica por seed; scratch/random_frozen comparten
backbone aleatorio; frozen/fine_tune cargan backbone source de esa seed.
Fine-tune usa lrbackbone.001/head.01;otros.01. Frozen/random_frozen entrenan
solo18parámetros,con backbone sin gradientes,eval/no_grad. No BN/Dropout en TinyCNN.

| Seed | Accuracy scratch | Random frozen | Frozen | Fine-tune |
| --- | --- | --- | --- | --- |
| 7 | .9609375 | .7890625 | .515625 | .453125 |
| 19 | .9609375 | .625 | .5 | .4921875 |
| 31 | .9765625 | .40625 | .5390625 | .5390625 |

Transfer no gana en este protocolo. Se conserva el resultado, sin ajustar datos,
tasas o duración para favorecerlo. No se aísla la causa entre apariencia, nuevas
etiquetas, inicialización y presupuesto. Igualar updates no iguala parámetros ni
calidad de ajuste. Las seeds comparten datasets, no son tres poblaciones.

## Controles, mapas y límites de interpretación

Geometry: arange1…25, kernel[[1,0],[-1,2]]. Ocho combinaciones s1/2,p0/1,d1/2,
112salidas comparadas exactamente con Conv2d float64. Se comprueban todos los
productos y padding por coordenada; kernel invertido rompe salida9. Padding
asimétrico right/bottom1 conserva5×5 con kernelpar. No se generaliza same a stride2.

Pooling2/2: max[[6,5],[7,8]],avg[[3.5,2],[2.5,4.25]],gradiente de suma con cuatro
unos o dieciséis.25. Maxnegativo−2 no se sustituye por0en bordes;avgcuenta padding
con divisor explícito. Píxel desplazado dentro/fuera de bin muestra tolerancia
limitada, no invariancia. Checkerboard conserva fase0/1 al submuestrear;media.5
ilustra este caso de aliasing, no una garantía general de anti-aliasing.

RF: r8,j2,start1 en conv2. Coordenada6,6 consulta índices9…16. Operador positivo
con kernels1 yaveragepool confirma soporte completo central8×8/esquina5×5.
No se presenta como el maxpool de la CNN entrenada: tiene misma geometría y
diferente gradiente local. GAP reúne mapa12×12,alcance teórico30 con padding,
entrada real24. No garantiza sensibilidad no nula en todos los píxeles.

Source7/epoch40: primeras validation de cada clase,índices0/32/64/96,regla fija.
Cinco etapas completas,112mapas,medias,logits/probabilidades y32gradientes de
conv2_pre[:,6,6] respecto a entrada. Escala compartida por etapa ymodo local
explícito. Los mapas no son detectores semánticos certificados;derivada local
no es causalidad ni explicación de la clase final. Coordenadas consultables.

ResidualBlock educativo,no entrenado como TinyCNN: Conv/BN/ReLU/Conv/BN más
identidad oproyecciónConv1/BN. Tests de shape y suma incompatible. Rama0 devuelve
ReLU(x),no identidad global ni gradiente1garantizado. Referencias primarias a
LeNet,VGG,ResNet,PyTorch yreceptive fields; sin copiar benchmarks de esas redes.

## Reproducción y pruebas

Captura2026-10-25T21:40:56.960649+00:00. Runtime CPU por digest reutilizado:
Python3.13.17,NumPy2.5.4,PyTorch2.14.1+cpu,linux/amd64. Dos CPUs/2GiB,un thread
Torch/OMP/BLAS/MKL,rednone,pullnever,rootfs/bindreadonly,/tmp temporal,user1000:100,
capdropALL,timeout300s. Limpia solo contenedor aleatorio propio precomprobado.
No quedan containers luisrc-cnn-. Sin torchvision,datasets o paquetes nuevos en host.

Once hashes de fuentes/tests/protocolo/runtime/runner. Source→target usa archivos
.pt reales temporales,torch.save/load weights_onlyTrue,map_locationCPU. Carga total
source→target rechazada por head incompatible. No se exportan checkpoints.
Verify repite15trainings ycontroles,comparando arrays,historias,gradientes,
versiones,datos yhashes con rtol1e-6/atol1e-7. Ambas copias JSON coinciden.
También exige presupuestos,freeze intacto yhead cambiada. No exige mejora estadística.

Nueve tests Python y3JS pasan. Contratos escritos antes de implementaciones:
fallos iniciales de import de geometry/networks/model ausentes,después verdes.
No se atribuye a esos fallos evidencia de cálculos que aún no se habían ejecutado.
177checks editoriales/estructurales y19tests blog pasan. Frozen pnpm install42
proyectos,41labs,303índices,141exports,sin nuevas dependencias o lockfile modificado.
Build50rutas,Pagefind10páginas/4280palabras/dos idiomas; drafts excluidos.
Inventario76draft_exists/19related_only/80not_written es existencia,no aceptación global.

## Revisión de presentación

Inspección visual móvil de nueve diagramas,tres figuras,cinco secciones del visor
ycurvas source/frozen. `/tmp/cnn-visuals/report.json`. Figuras≤380px yfont14en
plots;escalas compartidas conservan respuestas tenues en vez de aumentar contraste
silenciosamente. Soporte RF dibujado como región continua,gradiente con escala local
simétrica. Código inicia scrollLeft0. Tablas con scroll interno enfocable.

Primer navegador: `/tmp/convolutional-networks-layout.ujafVD` detectó overflow en
la tabla de geometría móvil:scrollWidth546con viewport360. Range de texto confirmó
la tabla. Se envolvieron todas las tablas nuevas en regiones accesibles;comprobación
específica posterior scrollWidth350. No se oculta overflow global ni se relaja el gate.
Captura SVG independiente dio timeout;se capturó como img desde origen local.
Prueba posterior Ylh5cf detectó una aserción mal ordenada: comprobar scroll inicial
DESPUÉS de desplazar con teclado. Se movió antes y se restablece scroll para las
capturas. No era un defecto del producto. Se verificó que los procesos habían
terminado antes de repetir; las ejecuciones finales se separaron por viewport.

Chromium final:20vistas,1440/360px. En cada ancho:112celdas con sus cuatro términos,
112mapas completos,32gradientes,45checkpoints y224selecciones de escala compartida/local. Curvas:15runs×2series×41puntos cotejados por ancho. Ambos modos
de pooling y sus gradientes,selectores,coordenadas,teclado,scroll interno,links,
iframe,404 ypeticiones locales. Sin errores JS ni overflow global.

Informes finales:
- `/tmp/convolutional-networks-layout.M0VtvM/report.json` (1440px).
- `/tmp/convolutional-networks-layout.cwjp6D/report.json` (360px).

Se revisaron también capturas de diagramas ycurvas DENTRO de posts a360px.
Servidor propio2066563 detenido;4322libre. No quedan containers de este laboratorio.

## Continuación

P102: embeddings,hidden state,longitudes variables,RNN/LSTM/GRU,vanishing gradients
yteacher forcing. Requiere predictor secuencial entrenado ydependencias largas.
Separar mecanismos antes de redactar;mantener experimento real ycontrastes,
sin sustituirlo por una animación estática. P104 conserva pretraining/PEFT/test no visto.
Preservar P026,Stripe sandboxP045,soakP058 ySerie02solo estructuras/algoritmos.
El objetivo editorial completo sigue activo; no hay commit/push automáticos.
