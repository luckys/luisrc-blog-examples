# PyTorch end-to-end training

Laboratorio español P099, siete artículos. Importa el modelo/generador canónico de
`../neural-foundations/neural.py`; no altera sus fuentes ni las de P098. Entrena
realmente con torch.Tensor, Dataset/DataLoader, nn.Module, autograd y torch.optim.
Los extractos explicados permanecen en el blog; el código completo vive aquí.

## Ejecutar desde la raíz

```bash
pnpm --dir packages/pytorch-training runtime:fetch
pnpm --dir packages/pytorch-training test:container
pnpm --dir packages/pytorch-training exercise
pnpm --dir packages/pytorch-training verify
pnpm --dir packages/pytorch-training test
pnpm --dir packages/pytorch-training render
```

runtime:fetch solo si falta la image PyTorch CPU ya usada en P097/P098. runtime.json
fija digest y linux/amd64. Sin pip/conda/uv o paquetes Python en host. Runner con
rednone,pullnever,rootfs y dos bindsreadonly,usuario1000:100,capdropALL,2CPUs/2GiB,
un thread OMP/BLAS/MKL. Solo crea un contenedor con nombre aleatorio precomprobado
y finally elimina ese recurso; no hace prune ni toca servicios cloud.

## Protocolo previo y formatos

protocol.json declara MLP2→4→1,tanh,float64,CPU. Train256 yvalidation128 con seeds101/102,
cuadrados alrededor de(±1,±1),semiancho.45. Inicializaciones NumPy7/19/31 copiadas a
Linear con weights transpuestos. No sigmoid en salida; BCE media desde logits.
SGDlr.1,momentum.9; StepLR por epoch completada,step_size20,gamma.5. Sesenta epochs,
batch30,cola16:540updates/15360muestras procesadas por run. Evaluación batch50,
colas6 en train y28 en validation. shuffleTrue solo train; generator420 dedicado,
num_workers0,drop_lastFalse. No es el orden NumPy de P098 ni un benchmark entre ambos.

Tres runs completos. Seed7 además: corte en epoch30,archivo real de reanudación y
cuatro continuaciones hasta60: completa,resetmomentum,resetorden y solo modelo.
Esta última omite varios estados y no aísla una causa. El resetmomentum conserva
la tasa actual y el reloj; el resetorden conserva optimizador/scheduler. Otra
ejecución seed7 guarda un archivo de inferencia y compara128logits tras cargar.

Los .pt se crean con torch.save en /tmp propio, se cargan con weights_onlyTrue y
map_locationCPU y se eliminan al cerrar TemporaryDirectory. No se versionan ni
exportan binarios. Atomic_save escribe .pending y reemplaza el destino del mismo
directorio; no es garantía de durabilidad distribuida. Las funciones aceptan una
ruta Path para que un programa las use con su almacenamiento persistente.

Esquema1/inference:arquitectura,dtype,state_dict. Esquema1/epoch_boundary_resume:
protocolo,seed,epoch,updates,modelo,optimizador,scheduler,RNGdel loader/RNGCPU,
history ytrace. El historial no es necesario para calcular gradientes, sí para
verificar la trayectoria. Cargar usa validación de kind/config y strictTrue.
No cambia a weights_onlyFalse ante un error. Aquí solo se cargan archivos propios.

## Métricas y comprobaciones

history:epoch0 y cada epoch,train/validation a pesos fijos,accuracy,onlineLoss
ponderada con los pesos cambiantes del recorrido,contadores,lrUsed/lrNext,orden
real ystate. Epoch0 tiene onlineLoss/lrUsednull yorder vacío. Se guardan256índices
por recorrido, no se supone cobertura a partir de la longitud del loader.
trace registra el primer batch antes/después de backward y después de step.

probes:resta broadcast4×4 frente a4×1 (MSE2.625/1.875),rechazo BCE,memoria NumPy
compartida/copiada,train/eval vsno_grad,Dropout separado,alias de state_dict y media
incorrecta de losses por batch. La MLP entrenada NO usa Dropout/BatchNorm.

Trece hashes:fuentes,tests,runner,runtime,protocolo ymodelo anterior. Las dos copias
results/training.json ycomparison.json deben coincidir. verify vuelve a entrenar,
guardar,cargar ycontrastar observaciones conrtol1e-10/atol1e-12; además exige error0
e historial exacto en la reanudación completa y error>1e-8 en los tres controles.
El archivo de inferencia reproduce logits exactamente en este runtime.

## Límites

Solo CPU,float64,num_workers0 ylímites de epoch. Sin test final,GPU,AMP,DDP,
augmentations aleatorias o reanudación a mitad de epoch. Se restaura el RNG CPU,
pero el forward principal no consume aleatoriedad; la ablation del loader prueba
la fuente aleatoria que cambia realmente el entrenamiento. NumPy usa generadores
locales reconstruidos desde seeds, no RNGglobal mutable durante el loop.
Los loaders fijos de evaluación tienen generadores separados y sus estados no
influyen en updates en este diseño. Cambiar esas condiciones exige revisar el checkpoint.

La igualdad local observada no promete igualdad entre versiones,equipos oCPU/GPU.
Los controles pueden terminar con mejor loss y seguir siendo reanudaciones distintas.
El visor selecciona datos archivados; no entrena,deserializa .pt ni expone control.
