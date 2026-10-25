# Neural foundations

Laboratorio P096: cinco artículos españoles y una MLP NumPy. Datos sintéticos,
sin credenciales ni servicios de pago. P097 se desarrolla en el paquete vecino `autodiff-foundations`; P098–P105 siguen pendientes; comprobar aquí
gradientes no sustituye el desarrollo editorial de backpropagation/autodiff.

## Reproducir

Node24.19.0/pnpm12.8.1 para el runner. Docker con la image de `runtime.json`
disponible: Python3.13.15/NumPy2.5.3, digest reutilizado del laboratorio ML.
El runner usa pull=never, red none, rootfs/bind read-only, user1000:100, dos CPUs,
2GiB y un thread BLAS/OMP/MKL. No instala paquetes Python en host o container.
Si falta la image falla explícitamente: en otra máquina hay que descargar antes
exactamente ese digest, sin sustituirlo por latest.

Desde la raíz del monorepo:

```bash
pnpm --dir packages/neural-foundations test:container
pnpm --dir packages/neural-foundations exercise
pnpm --dir packages/neural-foundations verify
pnpm --dir packages/neural-foundations test
pnpm --dir packages/neural-foundations render
pnpm blog:sync
```

Las herramientas JS del workspace se instalan solo con pnpm:
`pnpm install --frozen-lockfile --ignore-scripts`. Este paquete no añade dependencias.
El runner captura stdout tras éxito, valida JSON y sustituye los dos informes.
Limpia solo su nombre aleatorio previamente comprobado, sin prune. Verify vuelve
a entrenar; no se limita a comparar hashes. No puertos o recursos cloud.

## Dataset y protocolo

Cuatro centros(±1,±1), uniforme por coordenada±0,45. Clase1 si signos distintos.
Train256/validation128/test256, balanceados; seeds101/102/103, filas independientes
y disjuntas. No muestras a menos de0,55 de los ejes. El grid también cubre huecos
sin datos, por lo que su color no acredita generalización a ellos.

Cinco recorridos prefijados: logística3parámetros, MLPceros17 y MLPseeds7/19/31.
MLP2→4→1, tanh, logit de salida, BCEestable, float64, gradient descent full-batch,
3000actualizaciones, learning rate0,1. Snapshot0 antes de entrenar y cada150epochs:
21por caso. Validation se observa, no produce gradientes/early stopping. Test solo
se evalúa al final y no elige semilla/epochs. Vista inicial seed7 prefijada.

Inicialización uniforme sqrt(6/(fan_in+fan_out)), bias0. Control negativo con todos
los pesos0 y batch balanceado: hidden/logit/gradientes0. El bloqueo no se generaliza
a todo parámetro inicializado a cero o a cualquier problema.

## Pruebas y evidencia

Seis tests Python: dense/shapes/composición, sigmoid/BCEextremos, XORmanual,
diferencias finitas de17parámetros, splits, entrenamiento y control negativo.
Se escribieron antes del modelo. La primera invocación desde raíz encontró cero
tests; se corrigió el directorio y falló por módulo ausente. Luego pasan en host
Python3.12.3/NumPy1.26.4 y en el runtime fijado. Solo este último genera informes.

Gradient check: epsilon1e-5, rtol1e-5 y atol1e-8 para las diecisiete derivadas.
Ocho hashes de entradas. Verify reentrena cinco casos y compara números con
rtol1e-10/atol1e-12. Runtime, CPU y threads archivados; no igualdad bit a bit entre
BLAS/arquitecturas ni benchmark de tiempo/throughput/VRAM.

Tres tests JS contrastan ocho probes de105checkpoints, grid final25×25 completo,
activaciones ocultas y funciones de activation. Tolerancia absoluta2e-12.
El visor solo implementa inferencia sobre pesos NumPy, no otro entrenamiento.

Logística y ceros50%test; MLP7/19/31aciertan256/256. Esto no demuestra calibración,
generalización fuera del soporte, superioridad universal o convergencia con
cualquier semilla. Tampoco demuestra un teorema de aproximación universal.

## Viewer y exports

Ocho exports explícitos: HTML/controlador, inferencia, charts, JSON y tres SVG.
Solo módulos/JSON locales, teclado y error explícito; ninguna API de control.
Loss conserva escala común. Mapas p/h1..h4 conservan grid y cajas del soporte.
Los32puntos dibujados son validation, no test; test solo aparece al final.
El selector de activations no cambia el entrenamiento tanh.

Cambiar fuentes requiere exercise/verify/render y blog:sync. Revisar también las
cifras de los posts al generar nuevas observaciones. Posts en draft, sin traducción
o audio automático.
