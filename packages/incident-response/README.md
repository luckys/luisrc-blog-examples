# Incident response: batch size cero

Laboratorio de seis artículos españoles, con datos ficticios y HTTP real. Una API
y un worker en procesos Node distintos aceptan y completan jobs en memoria. El
harness introduce una configuración legacy válida sintácticamente pero incorrecta
para operar: `batchSize: 0`. Después contiene, restaura y verifica la recuperación.
No representa una interrupción de producción o un ejercicio de guardia humana.

## Ejecutar desde la raíz del monorepo

Node.js 24.19.0 o posterior, pnpm 12.8.1. TypeScript se ejecuta mediante el soporte
nativo de Node; `tsc` comprueba tipos sin emitir archivos. Sin dependencias runtime.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/incident-response test
pnpm --filter @luisrc-examples/incident-response typecheck
pnpm --filter @luisrc-examples/incident-response exercise
pnpm --filter @luisrc-examples/incident-response verify
```

Los nueve tests cubren el contraejemplo legacy, valores válidos e inválidos,
actualización sin mutación en caso de rechazo, scope/revisión, HTTP y recuperación,
seguimiento de acciones, estructura del handoff y checkpoint parcial.

`exercise` inicia y cierra sus propios procesos. La API escucha únicamente en
loopback, en un puerto efímero. No acepta direcciones o PIDs externos. El worker
solo recibe IPC; el canal de control de la API también es IPC privado. Los hijos
reciben un entorno mínimo, no todas las variables del proceso padre. No hay Docker,
proveedor, base de datos, broker, destinatarios o credenciales reales.

## Qué observa el ejercicio

1. Dos jobs completados con lote dos.
2. La ruta legacy acepta cero. Otros tres jobs quedan pendientes.
3. El worker avanza al menos tres ticks respecto a la captura de cola, sin nuevos
   intentos; `/live` responde 200. No se afirma bloqueo indefinido por una espera corta.
4. Se pausa admisión, se observa un 503 y se rechaza un cambio con scope incorrecto.
5. Restaurar lote dos drena los mismos cinco IDs, todavía sin reabrir admisión.
6. La ruta validada rechaza cero sin alterar lote o revisión.
7. Se reabre admisión y se verifican siete resultados `report:<id>`, cero pendientes
   y un intento por job en este recorrido.

El control comprueba instanceId y revisión esperada. Eso evita errores de alcance
y cambios basados en una revisión antigua dentro del fixture; no es autenticación
de administración ni compare-and-swap distribuido.

## Evidencia y reproducción

- `evidence/incident.json`: once observaciones, UTC, orden, tiempos monotónicos,
  PIDs distintos, entorno Node y hashes de fuentes, scripts, pruebas y documentos.
- `evidence/postmortem.md`: cronología derivada más análisis redactado del caso.
- `replay.json`: eventos y acciones permitidos para el visor estático.
- `recovery.svg`: recuentos derivados, no tiempos de respuesta humanos.
- `explorer.html` / `explorer.mjs`: lectura de esos datos, sin ejecutar comandos.

Cada paso guarda `.artifacts/checkpoint.json` antes de continuar. El archivo está
ignorado por Git y marcado como parcial; permite conservar capturas anteriores a
un fallo posterior. No es el informe final, ni una garantía de fsync, atomicidad o
recuperación ante un corte durante la escritura. Una nueva ejecución lo reemplaza.

`verify` compara hashes y consistencia del archivo existente; no vuelve a ejecutar
el incidente. Tras cambiar una fuente hay que ejecutar `exercise` antes de `verify`.
Los timestamps, PIDs y duraciones cambian. Las fechas del journal corresponden a
observaciones del harness, no a instantes internos exactos o métricas de MTTR humano.

## Documentos redactados y acciones

`docs/runbook.md` describe el recorrido automático y sus condiciones de parada.
`docs/coordination.json` es un tabletop example no enviado a personas.
`docs/actions.json` contiene roles y fechas ficticias. A01 y A03 están verificadas
solo en el fixture. A02 (detección/alertas) y A04 (durabilidad/crash) siguen abiertas.
La validación de estructura del handoff no prueba recepción ni acuerdo humanos.

## Límites

Cola volátil, máximo veinte jobs, trabajo síncrono mínimo. Sin persistencia, restart
recovery, retries, HA, efectos externos, carga sostenida o exactly-once demostrado.
No hay paging, guardia, tickets o comunicación ejecutada. La ruta corregida está
incluida en el mismo binario y se activa en ejecución: no se ha probado un deployment
o rollback de artefactos. El resultado describe exclusivamente esta ejecución local.
