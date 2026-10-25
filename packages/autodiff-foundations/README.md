# Autodiff foundations

P097, cinco drafts españoles. Reutiliza `../neural-foundations/neural.py` y su
checkpoint archivado sin modificar P096. Expone el backward de la misma MLP para
inspección, contrastándolo con gradientes canónicos, diferencias finitas y PyTorch.
No entrena otro modelo ni sustituye P098–P105.

## Reproducir

Node24.19.0/pnpm12.8.1 y Docker. Preparación mediante pnpm, sin pip/conda/uv en host:

```bash
pnpm --dir packages/autodiff-foundations runtime:fetch
pnpm --dir packages/autodiff-foundations test:container
pnpm --dir packages/autodiff-foundations exercise
pnpm --dir packages/autodiff-foundations verify
pnpm --dir packages/autodiff-foundations test
pnpm --dir packages/autodiff-foundations render
pnpm blog:sync
```

Image CPU Jupyter PyTorch por digest amd64 en runtime.json: Python3.13.17,
NumPy2.5.4,PyTorch2.14.1+cpu. Se consultó el manifiesto público antes de fijar digest;
no se afirma haber verificado firma. El runtime NumPy anterior no incluía autodiff.
La descarga es explícita; los ejercicios usan pullnever/rednone. No credenciales.

Runner: dos CPUs/2GiB, usuario1000:100, rootfs/bindsread-only, capdropALL, threads1.
Monta solo el paquete propio y neural-foundations. Nombre aleatorio comprobado y
limpieza propia en finally, sin prune. Parseo de informe completo antes de sustituir
los dos JSON; `.pending` ignorados. No puertos, despliegue cloud o GPU.

## Entradas y contraste

Protocolo previo: cuatro puntos(±1,±1), targets XOR,(4,1),MLP2→4→1 y BCEmeanfloat64.
Casos: pesos iniciales seeds7/31 y checkpoint3000seed7 de P096. El último caso lee
el informe original como fixture; no vuelve a entrenar bajo un runtime distinto.
Los dos paquetes conservan sus propios runtimes y fuentes hash.

Se derivan dw1,db1,dw2,db2 y estados dz2,dh,dz1. Orden de parámetros W1,b1,W2,b2,
por filas,17componentes. Un test también usa batch3 para separar n de hiddenwidth4.
Modelo original y traza deben coincidir, además del contraste independiente con PyTorch.

Diferencias centrales: siete epsilons1e-1..1e-13,34evaluaciones de loss por epsilon.
No mutan pesos. Criterio principalε1e-5,atol1e-8,rtol1e-5 por componente. Error relativo
mostrado usa denominador max(1e-12,abs(a)+abs(b)); no es el criterio de aceptación.
Los epsilons demasiado pequeños empeoran el contraste en los casos observados.

Cuatro controles numéricos incorrectos: missingmean,missingtanh,biasmean,extrasigmoid;
se rechazan en los tres casos frente a FDε1e-5. PyTorchgradcheck usa su propia función
de framework con eps1e-6/atol1e-5/rtol1e-3; no se presenta como chequeo directo del
backward NumPy. La comparación de este se hace por separado con numérico y autograd.

Grafo escalar: q=w*x,r=q+q,L=r². Sus dos contribuciones a q se suman. Cuatro entradas
prefijadas se contrastan con autograd. El visor recalcula esa ecuación acotada; no
llama a PyTorch para valores libres del navegador.

## Fallos PyTorch observados

Backward acumula, no actualiza pesos. Dos forwards nuevos producen2g; resetgradNone
recupera g. Detachhidden corta la trayectoria a los12parámetros de la primera capa:
None, no cero. Los otros5conservan gradientes. Hojas nuevas en ese experimento.
Un hidden non-leaf sin retaingrad conserva None después de backward, mientras las
hojas sí reciben grad; otra ejecución retiene hidden.grad(4,4).

Grafo consumido y lossno_grad producen RuntimeError en controles independientes.
No se afirma que todo grafo imaginable requiera savedtensors al derivar por segunda
vez. El VJP usa grad_outputs=(p-y)/n calculado sin historial como semilla de primer
orden; coincide con backward. No incluye derivadas de orden superior.

## Tests, evidencia y límites

Tests escritos antes de implementación: módulo manual ausente desde cwd correcto;
cuatro contratos manuales pasan, framework ausente en runtime PyTorch y después diez
tests Python pasan. Tres contratos del visor se escribieron antes del model.mjs y
contrastan casos escalares con Python/PyTorch y campos disponibles/null.

Catorce hashes: fuentes propias y dos dependencias de P096. Verify vuelve a ejecutar
los contrastes y controles, con rtol1e-10/atol1e-12 para la comparación del informe.
Runtime/CPU/threads archivados. No promesa de igualdad bit a bit entre BLAS/hardware;
los estadísticos de diferencias finitas son sensibles al redondeo.

Siete exports estáticos: HTML/controlador, model/charts,comparison.json y dos SVG.
El modelo JS solo calcula ecuaciones escalares y selecciona observaciones. El visor
no entrena, no expone API de control y no convierte gradNone en0. Errorchart usa ejes
log y escala común; gradientchart conserva signo y escala común entre casos para
cada método. Datos/intermedios se inspeccionan con teclado y tablas.

No prueba GPU, convergencia del entrenamiento, funciones arbitrarias, branchcontrol
ni órdenes superiores. Que los casos pasen no garantiza correctitud global.
Modificar una fuente hash requiere exercise/verify/render y blog:sync; las cifras
redactadas en posts también deben revisarse. Los posts siguen en draft.
