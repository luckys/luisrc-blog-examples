# Integración y contratos con dependencias reales

Cinco artículos españoles de P056: Testcontainers, datos de prueba, aislamiento,
schema tests y consumer-driven contracts. Código completo aquí; los posts conservan
extractos explicados, diagramas y ejercicios. Solo datos ficticios.

## Requisitos y comandos

Node 24.19.0, pnpm 12.8.1, TypeScript 5.9.2, pg 8.23.1, Ajv 8.20.0,
Testcontainers 12.2.1 y Pact 17.1.4, fijados en el lockfile único del monorepo.
Pact core 20.2.0 instala un binario nativo distribuido como paquete opcional;
no se habilitan scripts de instalación adicionales. Comprobado en Linux x64/glibc.

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/integration-contracts test
pnpm --dir packages/integration-contracts test:consumer
pnpm --dir packages/integration-contracts typecheck
docker pull postgres:18-alpine@sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15
pnpm --dir packages/integration-contracts test:integration
```

`test` solo ejecuta cuatro tests puros. `test:consumer` ejecuta dos tests del cliente
contra un mock HTTP de Pact y regenera exclusivamente
contracts/ReceiptWidget-OrdersApi.json. No requiere Docker, Broker o credenciales.
PACT_DO_NOT_TRACK=1 se configura antes de importar el SDK; el verificador también
lo pasa a los hijos. No hay envío de contratos o resultados a un servicio externo.

`test:integration` regenera tests/contrato y ejecuta nueve escenarios reales en un
contenedor privado. Nunca acepta un DATABASE_URL del usuario. Exige Docker local
(endpoint Unix); no Docker remoto/Cloud, que requiere otro diseño de conectividad.
El arranque exige imagen ya local, neverPull. No hay descargas de imágenes implícitas.

## Archivos y fronteras

- `src/fixtures.ts`: datos inmutables y tiempo explícito, sin contador o reloj global.
- `src/consumer.ts`: cliente real y lectores v1/v2, 404 validado como ausencia.
- `src/repository.ts`: SQL parametrizado y tablas cualificadas con schema validado.
- `src/representation.ts`: baseline/aditiva/v2 y dos variantes de fallo privadas.
- `src/http.ts`: proveedor GET local; no endpoint de escritura, identidad o UI.
- `sql/001_orders.sql`: PK, CHECK, timestamps y datos propios de cada schema.
- `schemas/order-v1.json`: JSON Schema 2020-12, no OpenAPI completo. createdAt solo string.
- `tests/database-fixture.mjs`: Testcontainers, schemas, pools y cleanup.
- `tests/http-fixture.mjs`: listen en puerto efímero, espera evento y cierra sockets.
- `tests/consumer.test.mjs`: genera dos interacciones Pact v4 con el cliente real.
- `tests/postgres.test.mjs`: constraints, conexiones, aislamiento, evolución y verifier.
- `scripts/verify.mjs`: ejecución acotada, recuperación por runId y artefacto con hashes.

Typecheck estricto cubre src/**/*.ts. El glue de herramientas/tests es JavaScript,
se verifica ejecutándolo, no se atribuye tipado estático a esos archivos.

## Lifecycle y seguridad del fixture local

Imagen oficial por digest, motor observado PostgreSQL 18.4. Memoria 0.5 GiB, CPU1,
datos tmpfs 256MiB, sin volúmenes/bind mounts del host. Puerto PostgreSQL efímero
publicado únicamente en 127.0.0.1. La subclase usa el hook protegido de la versión
fijada para establecer HostIp; docker inspect comprueba la configuración efectiva.

Una instancia por ejecución; un schema test_UUID por escenario y pool propio.
Tablas cualificadas, sin depender de SET search_path en una conexión prestada.
Mismo usuario privilegiado del ejercicio: namespaces de tests, no aislamiento RBAC/RLS.
Las consultas reciben valores parametrizados; los nombres interpolados son solo
identificadores generados y validados, no entradas públicas.

Auto-cleanup del reaper desactivado solo en este fixture para no iniciar Ryuk con
socket Docker montado. Cierre explícito de cada schema/pool/contenedor y finally del
wrapper que inspecciona etiquetas del runId antes de retirar recursos propios si
quedaran. No toca contenedores de otros proyectos, no ejecuta prune o borra bases
del usuario. Si muere también el wrapper no se garantiza recuperación automática.
No es una recomendación general de desactivar Ryuk ni se ha inyectado SIGKILL.
Se ha probado error de callback y retirada posterior de su schema.

## Resultados archivados

4 tests de núcleo + 2 de consumidor + 9 de PostgreSQL/HTTP/Pact. No sumar los
contadores por repetir el runner. evidence/verification.json se escribe únicamente
tras pasar suites y cleanup; registra herramientas, imagen, casos y SHA-256 de fuentes.
Un fallo deja la evidencia anterior intacta; los checks editoriales detectan hashes
obsoletos. Sin timings de rendimiento o certificación de producción.

- PostgreSQL rechaza ID repetido (23505) e importe cero (23514).
- Dos schemas contienen o-1 con importes 1250/9900 sin mezclarse.
- Dos PIDs reales: A inserta sin commit, API no ve o-1; B confirma o-2. Rollback de
  A no elimina o-2. La escritura B la hace el repositorio, no un endpoint inexistente.
- Error planned_failure también elimina el schema creado por su fixture.
- ALTER ADD label y UPDATE ficticio conservan v1=1250, v2=1250 y label=Libro.
- Pact verifica las dos interacciones contra baseline y aditiva.
- Renamed responde 200 con money pero pierde amountMinor: schema/cliente/verifier rechazan.
- Unit-drift devuelve 12: schema e integer matcher aceptan; expectativa 1250 falla.

provider states reinician solo la tabla privada antes de cada interacción, sin
endpoint público de reset. Publicación desactivada. providerVersion=local-lab se
incluye porque pact-core valida su presencia al recibir la opción de publicación,
incluso false en esta combinación de versiones. Primera ejecución pasó cinco casos
SQL y falló cuatro por esa configuración; corregido, nueve pasan. El test negativo
no aceptó el error de configuración como incompatibilidad de contrato.

## Límites y ejercicios

Sin Broker, can-i-deploy, CI real o consumidores en otros repos desplegados.
Contrato local con dos interacciones, no todas las expectativas de cualquier cliente.
No UI E2E, auth, TLS, workers, HA, almacenamiento durable o benchmark. ALTER en una
tabla mínima no prueba migración sin locks a escala. Reaper/timeout recovery no
se sometieron a muerte forzada. La API es solo lectura con modos de fallo del test.
El cliente restringe el origin inicial a loopback para el fixture, no es una política
general de SSRF/redirects para entradas no confiables.

Los posts incluyen ejercicios para quitar constraints, variar identidad/tiempo,
observar otra conexión y conservar el contrato antiguo mientras cambia el proveedor.
