# Runbook: API viva, informes sin completar (fixture local)

Estado: ejercitado automáticamente en fixture, no aprobado para producción.
Owner ficticio: reports-ops. Solo procesos hijos creados por scripts/fixture.mjs.
No recibe URL o PID externos. Datos ficticios, en memoria; máximo veinte jobs.

## RB1 · Confirmar alcance antes de modificar

Leer instanceId, origin loopback y worker PID de la instancia recién creada.
Inspeccionar /state y guardar config/revision, accepted/completed/queued, ticks,
attempts y resultados. /live200 solo prueba respuesta de la API, no resolución.
Abortar si la instancia no coincide o hay datos ajenos al fixture.

## RB2 · Declarar impacto sin inventar usuarios

Comparar IDs aceptados y estados, no el número de alertas. En este ejercicio hay
tres jobs aceptados bloqueados y ningún usuario de producción. Abrir un registro
de hechos e hipótesis. El harness guarda cada captura en .artifacts/checkpoint.json
antes del siguiente paso. Es evidencia parcial, no un informe final ni fsync durable.

## RB3 · Contener nuevas entradas

Control privado admission/open=false solo sobre instanceId esperado. Comprobar
que otra petición recibe503 y que los cinco jobs aceptados no se borran. Esto
limita crecimiento, no recupera trabajos y empeora aceptación de nuevas peticiones.

## RB4 · Contrastar la hipótesis

Inspeccionar cola no vacía, ticks que avanzan y attempts que no avanzan. Comparar
config batchSize0 con la revisión previa2. El selector slice(0,0) no toma trabajos.
No deducir un bloqueo de DB: este fixture no tiene base de datos o proveedor.

## RB5 · Mitigar un cambio acotado

Restaurar batchSize2 con expectedRevision recién observada. Si hay conflicto,
releer en vez de forzar. No reiniciar: perdería trabajo volátil. No vaciar cola ni
marcar jobs como completados manualmente. Guardar ACK y observar el drenaje.
Si no drena dentro del timeout del fixture, detener el ejercicio y conservar evidencia.

## RB6 · Verificar trabajo anterior y entrada nueva

Antes de reabrir admisión, comprobar queued0/completed5, mismos IDs aceptados,
result report:<id> para cada job y attempts1. Reabrir de manera controlada y probar
dos trabajos nuevos. Una respuesta200/202 no sustituye el contenido esperado.

## RB7 · Distinguir mitigación y candidato preventivo

El ejercicio activa la ruta validada en el mismo binario del fixture. Intentar
batchSize0 debe fallar sin cambiar revision o valor vigente. Después comprobar
nuevos jobs: completed7, queued0. No afirmar deploy de un arreglo a producción.
Conservar riesgos abiertos: sin broker durable, retries, HA o efectos externos.

Los timeouts protegen el harness; no son SLO de servicio ni tiempo de respuesta humano.
El control privado no es un plano de administración autenticado para exponer por red.
