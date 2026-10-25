# Incidente sintético: batch size cero

Datos ficticios, HTTP real y dos procesos locales. No usuarios de producción.

Impacto observado: tres trabajos aceptados sin progreso durante la observación y
una petición rechazada por contención. Ver incident.json para hechos completos.

## Cronología capturada

| Orden | Evento | UTC | ms desde harness |
| --- | --- | --- | --- |
| 1 | baseline | 2026-10-25T07:43:28.897Z | 133.703 |
| 2 | zero_applied | 2026-10-25T07:43:28.899Z | 135.725 |
| 3 | queued | 2026-10-25T07:43:28.912Z | 149.257 |
| 4 | stalled_alive | 2026-10-25T07:43:28.941Z | 178.294 |
| 5 | admission_paused | 2026-10-25T07:43:28.946Z | 182.630 |
| 6 | scope_rejected | 2026-10-25T07:43:28.947Z | 184.198 |
| 7 | config_restored | 2026-10-25T07:43:28.948Z | 185.096 |
| 8 | drained | 2026-10-25T07:43:28.976Z | 212.878 |
| 9 | candidate_enabled | 2026-10-25T07:43:28.977Z | 213.519 |
| 10 | guard_rejects_zero | 2026-10-25T07:43:28.979Z | 215.734 |
| 11 | recovery_preserves_work | 2026-10-25T07:43:28.995Z | 232.308 |

## Mecanismo y condiciones

Legacy acepta cero; slice(0,0) no selecciona trabajo. API live y ticks no prueban
finalización. Restaurar batch2 drenó la misma cola, sin borrar IDs. La ruta validada
rechaza cero y conserva revisión. Su activación ocurre en el mismo binario, no deploy.

## Seguimiento

A01/A03 verificadas solo en fixture; A02 observación/alertas y A04 durabilidad abiertas.
No se ejecutaron guardias, paging, restart recovery o efectos externos.
