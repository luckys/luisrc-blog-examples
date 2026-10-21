# ADR 0001: persistencia de solicitudes de reembolso

## Estado

Propuesta educativa, 2026-10-20. No desplegada, no benchmark comparativo.

## Contexto

El diseño objetivo necesita confirmar la reserva y el evento en una misma
transacción. Soporte necesita consultar por pago, solicitud y fecha sin depender
exclusivamente de una clave de acceso. El equipo del escenario conoce SQL y puede
operar PostgreSQL. Son supuestos del ejercicio, no una entrevista a un equipo real.

El laboratorio solo ejecuta un fake en memoria y comprueba reglas, conflictos de
revisión y fallos previos al commit. No ejecuta PostgreSQL ni DynamoDB.

## Restricciones

- No enviar un reembolso externo antes de confirmar la intención.
- No perder la reserva de otra solicitud sobre la misma revisión.
- Conservar un contrato consultable para investigar resultados inciertos.
- Mantener explícito que una transacción local no incluye al proveedor.

## Alternativas

PostgreSQL permite expresar relaciones, constraints y transacciones locales con
consultas SQL. Requiere diseñar índices, operar backups y probar recuperación.

DynamoDB puede usar escrituras condicionales y transacciones ACID; no se descarta
por una supuesta ausencia de transacciones. Requeriría diseñar claves e índices a
partir de los accesos y evaluar capacidad, costes y operación en AWS. Esa evaluación
no se ha ejecutado y no se atribuyen tiempos ni precios a esta alternativa.

Un archivo o un Map bastan para el ejercicio de reglas. No son una sustitución
probada para persistencia concurrente y recuperación del servicio objetivo.

## Decisión propuesta

Proponemos PostgreSQL para el servicio objetivo y un outbox en la misma base.
El motivo es la combinación de consultas operativas cambiantes, integridad local
y experiencia SQL asumida, no que otro motor sea incapaz de guardar pagos.

## Consecuencias

Hay que probar el adaptador y el relay, definir retención e idempotencia y ensayar
restauración. Añadir índices aumenta el coste de escritura. El esquema y las
migraciones pasan a formar parte del contrato operativo. La elección no resuelve
por sí sola una respuesta perdida del proveedor ni garantiza entrega exactly once.

## Evidencia y pendientes

Evidencia disponible: `tests/domain.test.mjs`, `tests/evidence.test.mjs` y las dos
trazas en `scenarios.json`. Solo verifican el fixture en memoria.

Pendiente para aceptar: implementar reserva + evento con una transacción SQL,
forzar dos escrituras concurrentes, provocar rollback y probar recuperación tras
reinicio. Evaluar accesos representativos y coste con supuestos de carga explícitos.

## Cuándo revisar

Reabrir si aparece un requisito multi-region, si las consultas convergen a accesos
por clave estables o si la medición revela un límite operativo concreto. Ninguna
de esas observaciones elige por sí sola un nuevo motor; abre una comparación.

## Referencias

- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
- https://www.postgresql.org/docs/18/ddl-constraints.html
- https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions

Consultadas el 2026-10-20.
