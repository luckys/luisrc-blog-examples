# Domain design and architecture decisions

Laboratorio de diez artículos en español. Node 24.19.0, TypeScript 5.9.2,
pnpm 12.8.1. Todo el estado es ficticio y vive en memoria. No solicita credenciales,
no envía pagos, no crea servicios cloud y no inicia Docker.

## Ejecutar desde la raíz del monorepo

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/domain-design test
pnpm --dir packages/domain-design typecheck
pnpm --dir packages/domain-design demo
```

Node ejecuta TypeScript mediante type stripping; eso no comprueba los tipos.
`typecheck` ejecuta el compilador en modo strict, con noUncheckedIndexedAccess y
exactOptionalPropertyTypes. No hay enums ni parameter properties que necesiten
transpilación. Solo se usan dependencias de desarrollo fijadas en el lockfile común.

## Orden y archivos

1. P044: Ubiquitous Language, `docs/language-examples.json`.
2. DOMAIN-CONTEXTS: fronteras y traducción, `src/contexts.ts`.
3. DOMAIN-ENTITIES: identidad de Shipment, `src/entities.ts`.
4. DOMAIN-VALUES: igualdad e inmutabilidad de Money, `src/domain.ts`.
5. DOMAIN-AGGREGATES: límite de reservas en Payment, `src/domain.ts`.
6. DOMAIN-SERVICES: política temporal, `src/return-policy.ts`, `src/return-boundary.ts`.
7. DOMAIN-REPOSITORIES: revisión y commit, `src/application.ts`, `src/scenarios.ts`.
8. DOMAIN-EVENTS: candidatos y confirmación, `src/domain.ts`, `tests/concepts.test.mjs`.
9. P047: C4, `docs/architecture.json`. Diseño objetivo, no despliegue del laboratorio.
10. ARCH-ADR: decisiones, `docs/adr/0001-refund-storage.md` y `docs/rfc/`.

Los índices individuales están en `../../posts/es/`. El blog conserva snippets
explicados; este paquete contiene el laboratorio completo y sus tests.

## Qué demuestra

- Money compara cantidad y moneda, rechaza importes inseguros y no se modifica.
- Shipment cambia de estado sin cambiar identidad; dos envíos del mismo pedido
  no son la misma entidad. Money.equals no altera cómo Map compara sus claves.
- La política temporal acepta el límite exacto de duración y rechaza un milisegundo
  después. Recibe tiempo explícito, sin reloj global. La frontera rechaza fecha
  imposible o no canónica. No son días de calendario ni una política legal.
- Payment protege el límite al reservar devoluciones sucesivas; IDs repetidos
  se rechazan, no se reenvía automáticamente el resultado anterior.
- Dos decisiones sobre el mismo estado pueden ser válidas por separado.
- El fake confirma una sola por revisión. Releer distingue conflicto técnico
  de límite de negocio. Un fallo previo al commit no guarda estado o evento.
- Las trazas del visor se regeneran ejecutando las clases y se contrastan con
  expectativas independientes. No son tiempos medidos ni una animación de una DB.

```bash
node packages/domain-design/scripts/export-traces.ts
BLOG_ROOT=../luisrc-blog pnpm blog:sync
BLOG_ROOT=../luisrc-blog pnpm test:editorial
```

## Límites deliberados

- Un proceso, un pago por instancia de fake, reservas pequeñas, sin durabilidad.
- La atomicidad es check-and-replace síncrono; no se prueba atomicidad SQL,
  crash recovery, réplicas, entrega durable ni exactly once externo.
- La frontera logística se valida por separado y no está integrada en un flujo.
- Sin autenticación/autorización, inspección de productos, firma de capturas,
  caducidad/cancelación de reservas, multi-currency conversion o money provider.
- El caso de uso no reintenta conflictos. `scenarios.ts` relee explícitamente
  para mostrar las dos posibilidades, con orden controlado, sin scheduler aleatorio.
- La interfaz del repositorio es interna y asume decisiones del dominio, no JSON
  hostil. La validación de DTOs y los errores HTTP pertenecen a otros laboratorios.
- El JSON C4 y la ADR son propuestas documentadas. Sus tests comprueban estructura
  y referencias, no que una arquitectura sea correcta o que un equipo la aprobara.
- No se ejecutan PostgreSQL, DynamoDB, outbox o el proveedor dibujados como objetivo.

No copiar este fake como almacenamiento de producción. Para adaptar a una DB,
definir y verificar el contrato de revisión, transacción y eventos con el motor real.
