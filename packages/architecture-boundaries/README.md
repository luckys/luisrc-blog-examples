# Architecture boundaries

Laboratorio de **Arquitectura: dependencias, módulos y despliegues**. Node 24.19.0,
TypeScript 5.9.2 estricto y pnpm. Fuentes completas aquí; los posts conservan sus
extractos explicados. Sin cuentas, Docker, SQL, Stripe o datos reales.

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/architecture-boundaries test
pnpm --dir packages/architecture-boundaries typecheck
pnpm --dir packages/architecture-boundaries boundaries
pnpm --dir packages/architecture-boundaries demo
```

Desde la raíz del monorepo. `test` borra tipos con Node; `typecheck` ejecuta tsc
separadamente. Los servidores de test se abren solo en 127.0.0.1 con puerto efímero
y se cierran al terminar cada test. No usa credenciales ni una API comercial.

## Artículos y código

| Artículo                      | Archivos principales                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| P045: puertos/adaptadores     | `src/modules/shipping/ports.ts`, `application.ts`, `src/adapters/http-provider.ts` |
| ARCH-LAYERS: capas/Clean      | `src/modules/shipping/domain.ts`, `scripts/check-boundaries.mjs`                   |
| ARCH-OWNERSHIP: módulos/datos | `src/modules/*/public.ts`, `src/adapters/ledger.ts`                                |
| ARCH-CQRS: proyección         | `src/modules/reporting/internal/projection.ts`, `src/demo.ts`                      |
| P046: despliegue              | `docs/decisions/0001-single-deployment.md`, `tests/http.test.mjs`                  |

`application.ts` en la primera fila pertenece a `src/modules/shipping/`. Dominio
contiene datos y validación, sin frameworks. Aplicación depende de dominio y puertos;
los adaptadores importan el API público del módulo. El demo conecta todo.

## Contratos

- Entrada: peso entero 1–20000 g, zona local/remote. No subtotal, envío gratuito o
  recargo: este ejercicio es cotización del proveedor, no el cálculo comercial de
  `design-principles`. Copias congeladas, sin coerciones de JSON.
- Rate: importe entero 0–1000000000 céntimos, EUR y providerReference con 1–64
  caracteres alfanuméricos/guiones. DeliveryQuote añade ID bajo el mismo criterio.
- RateProvider.quote recibe envío válido; responde tarifa o rechaza. Aplicación
  valida el resultado antes de guardar. No retries ni fallback gratuitos.
- HTTP: POST /rate con grams/area; respuesta price_minor/currency_code/quote_ref.
  Estado 200, application/json, UTF-8 válido y máximo 2048 bytes leídos. Redirect
  rechazado; timeout por AbortSignal. Origen configurado, solo HTTP 127.0.0.1,
  sin credenciales/path/query/hash. Restricción del harness, no control SSRF general.
- Memoria: record copia y valida; rechaza ID duplicado; antes de resolver conserva
  registro y evento en la instancia. failNextRecord lanza antes de modificar datos.
  eventsAfter devuelve copia de array y eventos congelados. Secuencia global local.
- Reporting: snapshot es cursor/count/totalMinor, otra representación. apply espera
  secuencia contigua; mismo replay no cuenta dos veces, replay contradictorio o ID
  nuevo repetido se rechaza. Guarda huellas sin retención y valida suma segura.

## Evidencia y límites

Tests de aplicación sin sockets y tests HTTP contra servidores reales locales:
cuerpo, traducción, 503, JSON/moneda/media type/cuerpo inválidos, redirect sin
contactar destino y timeout. No se mide latencia ni se simula una red entre nodos.

Los tests de módulos inspeccionan imports y reexports con el parser TypeScript,
incluidos imports de tipos. Rechazan acceso privado entre módulos, direcciones de
capa incorrectas, imports externos y carga dinámica. Política para rutas relativas;
no aliases, sandbox o prueba de pureza. Un global fetch puede escapar a un chequeo
de imports; los archivos nuevos requieren revisar la política.

El demo muestra antes `{cursor:0,count:0,totalMinor:0}` y después de entregar un
evento `{cursor:1,count:1,totalMinor:500}`. Aplicación y proyección son un proceso;
no hay worker autónomo. Sin entrega manual no hay progreso garantizado.

CQRS local, no Event Sourcing: el ledger guarda registros y eventos auxiliares,
no reconstruye su autoridad exclusivamente desde el log. No outbox durable, broker,
relay, SQL, ACK, recuperación, exactly-once o transacción distribuida. Map y array
no demuestran ACID. Un reinicio pierde los datos.

No cumple la sustitución Stripe sandbox de P045. P046 documenta alternativas,
no despliega microservicios. ADR educativa, sin aprobaciones o mediciones inventadas.
No usar fixtures sin auth/TLS como servicio de producción.
