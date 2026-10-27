# Glosario: entrenamiento eficiente en GPU

- **Host / device:** CPU que coordina y dispositivo que ejecuta operaciones
  enviadas; mover el modelo no mueve automáticamente todos los inputs.
- **Kernel:** trabajo ejecutado en GPU; una llamada Python puede encolarlo
  sin esperar a su finalización.
- **Stream:** secuencia de operaciones con reglas de orden y dependencias.
  Más streams no garantizan concurrencia ni eliminan dependencias.
- **Wall time:** tiempo transcurrido del intervalo definido, incluidas las
  esperas que ese intervalo incorpora.
- **Warmup:** fase previa para preparar recursos y observar ejecución estable;
  no elimina toda variación temporal ni equivale a aprender un modelo útil.
- **Allocated / reserved:** memoria ocupada de tensores del allocator frente
  a bloques que mantiene reservados; no son la memoria global del dispositivo.
- **Pinned memory:** memoria host fijada; su preparación cuesta recursos.
- **Non-blocking:** política que evita determinadas esperas desde host;
  no demuestra que una copia haya terminado o se solape con cómputo.
- **Throughput:** trabajo procesado por unidad de tiempo; no es latencia
  individual ni calidad del modelo.
- **Autocast:** selección de dtype por operación; no convierte necesariamente
  todos los parámetros a un formato reducido.
- **GradScaler:** escala la loss antes del backward, desescala y comprueba
  gradientes antes del step; no corrige cualquier problema numérico.
- **Microbatch / batch lógico:** grupo procesado en un backward frente al
  conjunto cuya loss determina un update; la reducción define su ponderación.
- **Self time:** atribución propia según la jerarquía del evento; no garantiza
  que todas las filas de una tabla sean intervalos independientes.
- **Determinism:** repetición del cálculo bajo condiciones concretas;
  no es una garantía universal entre versiones ni igualdad de tiempos.
