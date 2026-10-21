# Design principles

Laboratorio educativo de la serie española **Principios de diseño sin sobreingeniería**.
Node 24.19.0 y TypeScript 5.9.2 estricto. No cuentas, Docker, DB, red o datos reales.
Los snippets permanecen en el blog; aquí están fuentes, contexto y tests ejecutables.

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/design-principles test
pnpm --dir packages/design-principles typecheck
pnpm --dir packages/design-principles demo
```

`test` ejecuta JavaScript y TypeScript con el soporte de borrado de tipos de Node.
No hace análisis de tipos: `typecheck` es un paso independiente. `@ts-expect-error`
en `type-examples.ts` comprueba una asignación inválida esperada; no oculta errores
de otros módulos. No hace falta instalar ni invocar un compilador global.

## Lecturas y archivos

| Post              | Pregunta                                 | Archivos                                          |
| ----------------- | ---------------------------------------- | ------------------------------------------------- |
| P043              | Cohesión y motivos de cambio             | `preview.ts`, `presentation.ts`, `rates.ts`       |
| DESIGN-OCP        | Extensión por composición                | `rates.ts`                                        |
| DESIGN-LSP        | Sustitución por comportamiento           | `type-examples.ts`, `tests/rate-contract.mjs`     |
| DESIGN-ISP        | Capacidad de cada consumidor             | `application.ts`, `type-examples.ts`              |
| DESIGN-DIP        | Dirección de dependencias y construcción | `application.ts`, `adapters/memory.ts`, `demo.ts` |
| DESIGN-SIMPLICITY | Necesidad actual vs especulación         | `rates.ts`, `preview.ts`                          |
| DESIGN-DRY        | Conocimiento común vs parecido           | `eligibility.ts`, `rates.ts`                      |

Los nombres de archivo sin prefijo se refieren a `src/`. El índice de cada post
en `../../posts/es/` enlaza sus archivos concretos. No son siete aplicaciones
independientes ni una biblioteca pública de logística.

## Contratos del ejercicio

- Shipment: subtotal entero de 0 a 1000000000 céntimos, peso entero de 1 a 20000 g,
  zona `local` o `remote`. `parseShipment` valida una entrada desconocida y devuelve
  una copia congelada con esos tres primitivos. Campos ajenos no se conservan.
- RateRule: recibe un Shipment válido, no lo modifica, calcula sin I/O y devuelve
  un importe determinista en céntimos de EUR, entero de 0 a 1000000000. `standardRate`
  presupone datos válidos. `quoteWith` valida la entrada y el importe en ejecución.
- Standard: local 500, remote 900, gratuito desde subtotal 5000 inclusive.
  El peso no altera el precio dentro del rango permitido.
- Recargo: suma una cantidad no negativa, incluso sobre base gratuita. El resultado
  y la suma se validan. No representa impuestos ni un proveedor real.
- QuoteReader.find: resuelve Quote o null; un fallo se propaga, no se oculta como ausencia.
- QuoteWriter.save: resuelve después de conservar la cotización en esa instancia;
  rechaza IDs duplicados. IDs alfanuméricos/guiones de 1 a 64 caracteres.
- Memoria: Map privado, copia defensiva congelada de cada cotización, sin persistencia.
  Check y escritura son síncronos en un proceso; no prueba coordinación distribuida.
- Elegibilidad: dos políticas ficticias separadas. Paquete entregado hasta día 30;
  descarga no usada hasta día 14. Días enteros ya calculados. No normativa o fechas.

## Antes y después

`legacyPreview` mezcla cálculo y texto; `preview` los coordina separados. Ocho casos
de caracterización comparan ambas zonas y subtotales 0/4999/5000/9000. Tests de borde
independientes evitan confundir «igual que antes» con «correcto según la política».
La versión legacy es fixture de comparación, no otra API que extender con requisitos.

La matriz LSP muestrea 24 entradas por candidato. Pasa para la tarifa normal y su
recargo; los tests detectan un candidato que rechaza 1001 g, uno negativo y uno que
intenta mutar el objeto. La función `lightOnly` tiene tipo RateRule y compila: así
se contrasta firma con comportamiento. No se demuestra pureza o LSP formalmente.

El test de confirmación controla una promesa y deja avanzar el event loop, sin un
sleep por milisegundos. El caso de uso espera al writer. Otros casos verifican fallo
propagado sin retries, entrada inválida sin escritura, copias e instancias aisladas.

## Límites que no deben perderse al reutilizar el código

Sin autenticación, impuestos, FX, fechas, almacén SQL o proveedor. El texto con
`toFixed(2)` preserva el antes, no implementa localización completa. El freeze solo
protege estas estructuras planas; no hace puras funciones arbitrarias ni impide
que otro código ejecute efectos sobre su propio estado.

No reemplazo Stripe sandbox, comparación de latencias, durabilidad ni CQRS desplegado.
P045/P046 siguen requiriendo entregas propias. Contratos TypeScript no son permisos.
El laboratorio no completa el roadmap por tener tests o siete índices.
