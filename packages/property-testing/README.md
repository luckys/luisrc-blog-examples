# Property-based testing: contraejemplos reproducibles

Laboratorio de siete artículos españoles en draft. Node.js 24.19.0, TypeScript
5.9.2 estricto en src, fast-check 4.10.2 fijado. Tests y glue MJS ejecutados con
el runner nativo. No servidor, Docker, credenciales ni llamadas a proveedores.

## Ejecutar

Desde la raíz del monorepo (usar su único lockfile):

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/property-testing test
pnpm --dir packages/property-testing typecheck
pnpm --dir packages/property-testing verify
```

test: quince tests, incluidas búsquedas contra variantes deliberadamente malas.
Se exige fallo por AssertionError, no cualquier error de configuración/import.
verify: repite tests/búsquedas y replay; escribe evidence/verification.json
solo después de validar resultados, con versiones y hashes SHA-256 de fuentes.
No descarga herramientas, inicia procesos remotos ni muta archivos del SUT.

## Recorrido y fronteras

1. P057: src/money.ts, tests/properties.test.mjs. Quinientos repartos con
   seed5701. Longitud, conservación, enteros, equilibrio; fronteras explícitas.
2. PBT-SHRINK: tests/search.test.mjs. Seed5702 encuentra late-decline en la
   sexta ejecución; cuatro reducciones, path5:3:6:7:6. Replay repite entrada.
3. PBT-MODEL: tabla independiente en tests/sequence.mjs, Payment en
   src/payment.ts. Quinientas secuencias de hasta40 eventos, una operación,
   estado y contador. Arrays normales, no fc.commands/model checking.
4. PBT-RACES: src/concurrency.ts. Scheduler controla continuaciones de
   promesas; regresión read/read/write/write deja1 en vez de2. Arreglo local
   sin await entre lectura/escritura, cien schedulers; no atomicidad SQL.
5. PBT-FUZZ: src/parser.ts. Mil arrays de hasta300 bytes y trescientos objetos
   válidos. Parser máximo256 bytes, UTF-8 fatal/JSON/campos, extras ignorados.
   No guía por cobertura, límites HTTP, auditoría DoS o rechazo de claves repetidas.
6. PBT-FAULTS: src/recovery.ts. Quinientas secuencias de hasta12 fallos;
   before-effect, after-effect, after-confirm, none. Nuevo servicio por intento,
   mismo journal/Set fake en memoria. Intento final sin fallo exige progreso.
   Clave estable produce un único efecto por contrato del fake; variante nueva
   clave duplica tras respuesta perdida. Sin consulta de reconciliación o red.
7. PBT-MUTATION: tres variantes manuales detectadas por propiedades fuertes.
   Terminal estable deja sobrevivir duplicate-capture. Sin Stryker/score global.

Los ejemplos de código permanecen dentro de los posts. Índices por artículo en
posts/es/{p057,pbt-shrink,pbt-model,pbt-races,pbt-fuzz,pbt-faults,pbt-mutation}.

## Decisiones y límites

- Una propiedad finita no prueba todas las entradas; seed/path dependen de código,
  generador y versión. Las regresiones explícitas conservan el caso sin ese vínculo.
- Un oráculo también puede fallar: se corrigió comparación de prototipos de records
  generados porque JSON no transporta prototipos; se comparan campos del contrato.
- Las variantes de Payment son fixtures educativos, no incidentes de producción.
- Capturas locales y efectos del Set son modelos separados, no ledger conectado.
- Reconstruir un objeto no es reiniciar un proceso. Journal/proveedor desaparecen
  al finalizar. Sin disco durable, SIGKILL, SQL, HTTP, paralelismo o PSP real.
- No comparar tiempos de esta suite como benchmark. No declarar exactly-once.
- Tipos estrictos solo en src; los tests MJS se validan por ejecución.

## Referencias primarias

- https://fast-check.dev/docs/core-blocks/properties/
- https://fast-check.dev/docs/core-blocks/arbitraries/
- https://fast-check.dev/docs/advanced/model-based-testing/
- https://fast-check.dev/docs/advanced/race-conditions/
- https://fast-check.dev/docs/advanced/fuzzing/
- https://fast-check.dev/docs/api/interfaces/Parameters/
- https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/

Consultadas el 22 de octubre de 2026. Versiones fijadas para reproducibilidad,
no afirmación de últimas versiones o recomendación de producción.
