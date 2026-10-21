# RFC: revisar persistencia de reembolsos

Estado: abierta, ejercicio educativo sin aprobación de un equipo real.

## Pregunta

¿Bajo los accesos y restricciones de ADR 0001, hay motivos verificables para
preferir DynamoDB o para mantener PostgreSQL como propuesta?

## Revisión propuesta

Participan hipotéticamente una persona de backend, una de operación y una que
conozca las consultas de soporte. Cada una revisa sus supuestos; el fichero no
presenta aprobaciones o nombres inventados.

## Objeciones que deben poder responderse

1. ¿Qué consultas necesitan filtrado que no cubren los accesos conocidos?
2. ¿Qué confirma exactamente una escritura y cómo se recupera un resultado incierto?
3. ¿Qué pasa si el relay repite el mensaje o se reinicia después de enviarlo?
4. ¿Qué evidencias faltan para aprobar persistencia, restauración y carga?

## Cierre

No hay cierre automático por puntuación. Registrar respuestas y evidencia; si se
acuerda una decisión, actualizar el estado de la ADR sin borrar estas objeciones.
Si cambia la decisión después, crear otra ADR que sustituya la anterior y enlazar
ambas. No reescribir la historia como si la alternativa siempre hubiera sido obvia.
