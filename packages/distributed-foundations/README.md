# Distributed foundations

Laboratorio de seis artículos españoles de fundamentos distribuidos. Solo datos
ficticios. Node.js 24.19.0, TypeScript 5.9.2 estricto y pnpm 12.8.1.

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/distributed-foundations test
pnpm --dir packages/distributed-foundations typecheck
pnpm --dir packages/distributed-foundations demo
```

No requiere cuentas, credenciales, contenedores, servidores, red o datos externos.
Node ejecuta los tipos borrables de TypeScript; el typecheck es una verificación
separada. Los tests .mjs comprueban también entradas inválidas en runtime.

## Relación con los artículos

| Post | Archivos | Observación |
| --- | --- | --- |
| P048 | src/replication.ts; tests/replication.test.mjs | A 1/shipped, B 0/pending; después B 1/shipped |
| DIST-QUORUM | src/quorum.ts; tests/quorum.test.mjs | nueve pares de subconjuntos de tamaño dos se cruzan |
| DIST-CONSENSUS | src/voting.ts; tests/voting.test.mjs | 720 órdenes, como máximo una mayoría por term en ese caso |
| DIST-CLOCKS | src/clock.ts; tests/clock-routing.test.mjs | envío 1, recepción 9 y evento local 10 |
| DIST-CAP | src/replication.ts; tests/replication.test.mjs | lectura antigua frente a rechazo con token de frescura |
| DIST-SHARDING | src/routing.ts; src/demo.ts; tests/clock-routing.test.mjs | revisión 1 rechazada después de cambiar owner a revisión 2 |

Demo: confirmación 1/shipped; B 0/pending antes de entrega; not_caught_up al exigir
mínimo 1; B 1/shipped tras entrega; nueve intersecciones; 679/1000 claves ficticias
remapeadas al cambiar hash modulo 2 a modulo 3. No extrapolar ese recuento.

## Supuestos y límites

- Registro de un único writer con snapshots completos y versiones enteras únicas.
  Entrega manual reordenable; no hay transiciones obligatorias, transporte, reloj
  físico, disco, failover o reparación automática. Convergencia requiere entrega.
- Quorum enumera conjuntos de miembros fijos, máximo dieciséis. No ejecuta quorum
  HTTP ni prueba linearizability, concurrent writers o membresía dinámica. Selección
  por máximo supone versiones comparables y rechaza contenidos contradictorios.
- Voter implementa solo reglas de voto inspiradas en Raft. Snapshot pasado a otra
  instancia simula conservar estado, no persistencia real. Sin AppendEntries,
  commit, temporizadores, state machine, autoridad de lectura o consenso completo.
  720 schedules de seis solicitudes en un term no son verificación formal.
  X/Y identifican candidaturas abstractas, no miembros adicionales. No modelamos
  el origen de cada candidatura, el voto propio o la máquina de roles de Raft.
- Lamport no mide duración, no prueba causalidad inversa ni implementa vector clocks.
- La lectura por token solo exige un mínimo de versión. No es prueba de CAP ni una
  implementación CP/AP. Retener mensajes no particiona una red real.
- Routing usa SHA-256 truncado a 32 bits y modulo; no implementa consistent hashing.
  Directorio con revisión global en memoria. move cambia metadatos, no datos, y no
  valida capacidad del destino. No fencing distribuido o migración recuperable.

Veinticuatro tests locales. Primero fallaron imports ausentes; el primer desarrollo
llevó veintidós casos a verde. Después un caso nuevo mostró que se aceptaba restaurar
un voto en term 0; se añadió validación y pasó. Otro caso valida que recordar un term
superior no depende de conceder voto. No se atribuye un ciclo red/green a cada caso.
