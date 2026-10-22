# Pruebas de software: reglas, fronteras y evidencia

Laboratorio de cinco artículos españoles. Node 24.19.0, TypeScript 5.9.2 estricto,
test runner nativo y SQLite de `node:sqlite`. Datos ficticios; no aplicación de
producción. Los snippets explicados siguen dentro de los posts.

## Modelo y decisiones

Registro de trabajos: queued acepta start o cancel; running acepta succeed o fail.
succeeded, failed y cancelled son terminales y solo repiten su propio comando.
No se ejecuta trabajo real, ni se detiene un worker por cambiar un estado.

- `src/transitions.ts`: tabla privada y transición pura; cinco estados por cuatro comandos.
- `src/machine.ts`: ID, validación runtime, objetos congelados y versión segura.
- `src/service.ts`: read, expectedVersion, transición y compare-and-set condicional.
- `src/repository.ts`: validación del salto de versión; no política de transiciones.
- `src/memory.ts`: fake Map volátil.
- `src/sqlite.ts`: adaptador real SQLite, SQL parametrizado, unicidad y UPDATE condicional.
- `src/http.ts`: componente API con GET/POST, validación y códigos de error públicos.

El contrato que consume execute tiene read y compareAndSet. Los adaptadores añaden
insert para preparar registros; no hay endpoint de creación. El servicio valida
las reglas; llamar directamente al repositorio no valida la transición de negocio.
Repetir succeed en versión 2 conserva el estado; repetir una petición antigua con
expectedVersion 1 causa conflicto. No hay idempotency keys ni deduplicación remota.

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/testing-strategy test
pnpm --dir packages/testing-strategy test:integration
pnpm --dir packages/testing-strategy typecheck
pnpm --dir packages/testing-strategy coverage:weak
pnpm --dir packages/testing-strategy mutation
pnpm --dir packages/testing-strategy verify
```

No nuevas dependencias runtime, Docker o descargas de imágenes. `test:labs` incluye
solo `test`, no inicia la integración SQLite/HTTP o el experimento de mutaciones.

## Qué ejecuta cada suite

`test`: 28 tests, 24 del núcleo (incluye veinte parejas) y cuatro del servicio.
Stub de ausencia, spy de escrituras, rechazo del almacenamiento y fake con estado.

`test:integration`: once tests. Tres escenarios compartidos, ejecutados contra
Map y contra SQLite :memory:, más uno de archivo cerrado/reabierto y cuatro HTTP.
El motor SQLite en memoria es real, el Map es un fake. Cada test HTTP utiliza una
base nueva y puerto efímero en 127.0.0.1; se espera listening, no un sleep. Se
cierran sockets y conexiones. El único archivo se crea en mkdtemp y se elimina
después de cerrar SQLite. No se modifica ninguna base del usuario.

La API no es E2E de una plataforma: no hay UI, autenticación o worker. La prueba
de fallo HTTP usa un stub explícito que lanza un error privado; no rompe disco real.
El cuerpo se acumula hasta 1024 bytes, pero se termina de consumir la petición.
No es protección completa de admisión, DoS, UTF-8 estricto o claves JSON duplicadas.

`coverage:weak`: contraejemplo intencionado que ignora valores y errores, excluido
del test normal. Con Node 24.19.0 alcanza 100 % en líneas/branches/funciones de
**src/transitions.ts solamente**. No mide machine, servicio, SQL, HTTP o toda la suite.

`mutation`: baseline débil y núcleo; cuatro mutaciones manuales en copias mkdtemp.
Tres alteran reglas ejecutadas por la suite débil; la cuarta cambia la versión en
machine.ts, fuera de su alcance. Las cuatro pasan la suite débil y fallan por
ERR_ASSERTION en el núcleo. Import/syntax errors y timeout no se cuentan como detección.
Se retiran solo las copias temporales creadas por ese run. Sin Stryker o score global.

`verify`: repite 28/11 tests y el contraejemplo, registra versión y SHA-256 de fuentes,
tests y scripts en evidence/verification.json. No ejecuta mutation: su resultado
se regenera aparte en evidence/mutations.json. Un fallo no sobrescribe evidencia
anterior; los checks editoriales detectan hashes desactualizados. Artefactos archivados,
no evidencia de producción ni benchmarks.

## Desarrollo y límites

Se escribió primero la expectativa terminal: fallo por módulo ausente, después
fallo de aserción con una implementación que devolvía el estado y green con la regla
mínima. La matriz añadió seis fallos sobre esa versión y pasó tras completar reglas.
Después se separó transitions de machine manteniendo los tests. El resto de los tests
se preparó antes de sus módulos, con fallos de exports/imports; no se atribuye un
ciclo individual red-green a cada escenario o al handler HTTP.

DatabaseSync es síncrono; Promise.all no simula escritores paralelos en procesos
distintos. Una sola conexión por fixture, sin locks contendidos, pérdida eléctrica,
crash/failover, PostgreSQL o Testcontainers. La reapertura tiene cierre limpio.
Versionado local no prueba exactly-once externo o seguridad completa frente a carreras.
No UI E2E, contratos entre servicios, fuzzing, carga o Stryker ejecutados.

Referencias primarias y ejercicios están en cada post. El remoto de ejemplos debe
estar creado y subido antes de que los enlaces GitHub sean navegables públicamente.
