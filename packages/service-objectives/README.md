# Service objectives: SLI, SLO, budgets and multi-window conditions

Laboratorio determinista de P060. Los seis posts mantienen sus extractos explicados;
este paquete contiene fuentes, pruebas, contrato y simulación completa. Servicio
ficticio e independiente de una empresa o proveedor. No es un monitor de producción.

## Ejecutar

Desde la raíz del monorepo, con Node24.19.0 y pnpm12.8.1:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/service-objectives test
pnpm --filter @luisrc-examples/service-objectives typecheck
pnpm --filter @luisrc-examples/service-objectives verify
```

`simulate` sobrescribe evidence/simulation.json, scenarios.json, model.mjs y
burn-rate.svg. Genera datos, no tráfico. No arranca servidores ni contenedores.
TypeScript5.9.2/esbuild0.25.10 reutilizados del workspace; no dependencias runtime.

```bash
pnpm --filter @luisrc-examples/service-objectives simulate
pnpm --filter @luisrc-examples/service-objectives verify
```

El bundle browser model.mjs se genera desde los mismos .ts probados, sin imports
externos. explorer.html/explorer.mjs usan ese módulo y scenarios.json por HTTP.
Los tests de navegador del blog prueban su versión exportada. No abrir como file://.

## Modelos

- sli.ts: elegibilidad y resultado del cliente simulado para GET/reports/{id}.
  Nueve observaciones:6elegibles,3disponibles,2correctas en≤300ms. bodyValid y
  expectedNotFound son oráculos de fixture, no validación automática de respuestas.
- cohorts.ts: deadline5min, misma maduración para éxitos y pendientes. En t10:
  4elegibles/1buena,2inmaduras/1futura. Tiempo en minutos simulado.
- windows.ts: rejilla desde minuto0, prefijos, [inicio,fin), cobertura explícita.
  Prueba pequeña de calendario con fronteras dadas, no calendario civil o DST.
- budget.ts: target en PPM y productos enteros seguros; no acepta100% o recuentos
  fuera de rango. Sin eventos:SLI/consumo/cumplimiento null, no100%.
- alerts.ts: tres pares1h/5min14.4,6h/30min6,3d/6h1. Comparación estricta; AND dentro
  del par; prioridad page frente a ticket. No motor de notificación.
- simulation.ts: siete secuencias de43200min. Los segmentos son entrada comprimida;
  cada minuto se expande y agrega. Constante1000eventos/min excepto low/no traffic.

Sin errores:budget restante43200. fast/recovered:1500malos/restante41700; solo el
primero dispara al final. slow:3600malos/restante39600, par lento firing. Lowtraffic:
1malo/42.2restantes, par rápido insuficiente. No traffic:nullcumplimiento. Missing:
5minsin cobertura, budgetnull. Son resultados de simulación, no mediciones.

## Evidencia y verificación

Doce tests: clasificación, umbral, duplicados, maduración, deadline, fracciones/deuda,
burn/proyección, fronteras, cobertura, ponderación, estados de alertas y contrato.
Se escribieron expectativas antes de la implementación. Ninguna prueba depende
de latencias de hardware o usa un sleep para representar treinta días.

evidence/simulation.json guarda resultados y hashes de src/scripts/tests/spec.
verify recalcula todo, valida hashes y compara el bundle browser. Gráfica SVG y
datos del visor son derivados. El visor diferencia presupuesto final30d de evaluación
de alertas; incluye controles de target, escenario, par, instante y maduración.

spec/objectives.json usa formato lab-v1 propio, NO OpenSLO. budget-policy.json es
propuesta sin enforcement. alert-runbook.md tiene owner/acción ficticios; no hay rota.

## Límites

Sin endpoint desplegado, tráfico real, scraping, Prometheus/Alertmanager, cloud,
paging, for/pending duration, grouping, inhibition, acknowledgements o repetición.
Sin mecanismo real de rollback, guardias o aplicación de la política a CI/CD.
Estados no firing con datos insuficientes NO prueban salud; requieren otra decisión.

Rejilla regular y completa del escenario, salvo huecos explícitos. Sin scrapes
irregulares, counter resets, late arrivals, reloj distribuido o cálculo de meses.
No sumar ratios de intervalos ni extrapolar periodos parciales a30d. Thresholds
temporales equivalentes a fracciones del presupuesto suponen tráfico uniforme.
Proyecciones de agotamiento son condicionales, no predicciones estadísticas.

Sin validación del objetivo con tráfico de una población real ni justificación comercial de targets.
La política no sustituye requisitos de seguridad o integridad. Datos ficticios;
sin traducción, audio, publicación, commit o push automáticos.
