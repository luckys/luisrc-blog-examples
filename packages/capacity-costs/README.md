# Capacity and costs

Laboratorio editorial P066. Node.js 24.19.0, TypeScript con tipos eliminables,
pnpm 12.8.1. Sin dependencias npm propias, infraestructura, credenciales o tarifas
externas. Dinero en microUSD enteros mediante BigInt; salidas JSON como strings.
El TypeScript se comprueba en modo strict y el visor usa su copia sin tipos,
generada por `node:module.stripTypeScriptTypes`, no otra implementación.

Desde la raíz:

```bash
pnpm --dir packages/capacity-costs typecheck
pnpm --dir packages/capacity-costs test
pnpm --dir packages/capacity-costs exercise
pnpm --dir packages/capacity-costs verify
pnpm --dir packages/capacity-costs render
```

No requiere instalación para ejecutar con la versión indicada de Node.
`typecheck` usa TypeScript 5.9.2 mediante pnpm dlx, sin alterar el lockfile del
workspace. Puede necesitar acceso a registry si ese compilador no está en caché.
La eliminación de tipos de Node no sustituye esta comprobación estática. Para el
workspace completo: `pnpm install --frozen-lockfile --ignore-scripts` en la raíz.
Tests definidos antes del modelo: primera ejecución falló por módulo ausente;
siete contratos pasan con la implementación. No se llama a ese fallo un benchmark.

## Entradas y unidades

`scenarios.json`: tres días hipotéticos repetidos treinta veces: estable8RPS24h,
horario10RPS16h/120RPS8h, campaña20RPS23h/300RPS1h. CPU10ms/petición,1core/réplica,
target60%,margen1,mínimo2,máximo8. Demandas enteras hasta10000RPS, días1..31,
bytes0..1e6, almacenamiento0..100000GiB. La validación rechaza entradas fuera del
alcance; no pretende modelar todas las configuraciones del mundo real.

Tarifas **ficticias**:0,06USD/h-réplica,30USD/mes fijo,1USD/millón de peticiones,
0,10USD/GiB-mes y0,09USD/GiB de salida. 1GiB=2^30bytes,50GiB de stock en el mes,
10000bytes por petición ofrecida,99,9% buenas supuesto, no observado. Las líneas
se redondean hacia arriba a microUSD, se suman exactamente y no son un TCO.
Excluye DB, balanceador, logs, backups, impuestos, ingeniería, tráfico entre zonas,
arranque/rollout y reglas de descuento reales. No se reutilizan precios AWS.

`replicasFor`: mínimo CPU por target más una réplica de margen, sujeto a máximo;
retiene required y feasible. Añadir réplicas no garantiza HA ni latencia. Si el
modelo CPU es inviable, el subtotal solo valora la capacidad permitida: no es un
presupuesto para atender la demanda completa. Duplicar CPU deja campaña inviable.
El presupuesto supone preparación perfecta por franja; no simula el mes completo.

## Simulación separada

60 pasos fluidos de5s durante300s; demanda20RPS excepto300RPS entre60y180s.
Se decide cada15s con demanda conocida, preparación30s y descenso tras60s con
objetivo inferior. No emula HPA ni su señal CPU. Techo por réplica100RPS; DBglobal800RPS
(o200en variante lenta). Cola1000, sin timeouts/reintentos/peticiones individuales.
Los contadores satisfacen llegadas=servidas+rechazadas+cola en cada paso.
Hay2000rechazos calculados en reactivo,0con mínimo6 y11000con DB200.
Las filas registran [time,until): RPS/réplicas aplicadas durante intervalo y cola/
contadores al final. No hay latencia por petición o percentiles. La curva es una
simulación, no evidencia de Kubernetes real ni un benchmark del host.

## Contrastes, compromisos y FinOps

Se archivan CPU×2, payload×10, dos tiempos de servicio DB y compromisos de2/6unidades.
Contrato inventado:0,042USD/unidad-hora pagada siempre, exceso a0,06; ociosidad no
transferible entre horas. No reproduce Savings Plans ni compra capacidad.
Asignación5:3:2 por mayores restos con desempate por índice: reconcilia el total,
pero los pesos ficticios no demuestran causalidad ni justicia de reparto.
Coste por millón ofrecidas y buenas usa mismo alcance; cero buenas devuelve null.

## Evidencia y exports

`exercise` genera calculations.json y comparison.json con nueve hashes de entradas,
versión Node y fecha de cálculo. No datos medidos. `verify` recalcula resultados,
verifica hashes y exige que model.mjs sea la transformación exacta de model.ts.
Cambiar una entrada exige ejecutar de nuevo exercise, verify y render; después
`pnpm blog:sync` desde raíz para copiar solo los seis exports permitidos al blog.

`chart.mjs` dibuja demanda/techo calculados, `render-results.mjs` genera subtotales
ideal y pico permanente. El visor tiene controles separados para presupuesto y
simulación, teclado, error explícito y ninguna API de control. Los resultados
interactivos son nuevas evaluaciones hipotéticas de la misma función probada.
No invoiceValidated, cloudMeasured, latencyDistributionMeasured o hpaEmulated.
