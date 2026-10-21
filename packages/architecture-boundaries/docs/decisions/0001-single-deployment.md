# ADR 0001: un despliegue con módulos de Shipping y Reporting

Fecha: 2026-10-21.
Estado: decisión del laboratorio. No aprobación organizativa ni despliegue de producción.

## Contexto

El ejercicio cotiza envíos mediante un puerto de proveedor, confirma registros en
memoria y deriva un resumen. El proveedor se puede sustituir por fixture o HTTP
loopback. No hay carga representativa, equipos independientes, SQL o datos reales.

## Decisión

Un proceso de aplicación con módulos lógicos Shipping y Reporting. Cada módulo
expone public.ts; otro módulo no importa detalles privados. Adaptadores fuera de
los módulos y composition root explícito. El checker verifica imports estáticos,
no seguridad o pureza. Reporting recibe eventos por entrega manual en el demo.

El proveedor de los tests HTTP corre en un servidor loopback efímero. Es una
dependencia externa de fixture, no un despliegue independiente del módulo Reporting.

## Alternativas

1. Una estructura compartida mutable para cotizaciones y resumen: menos contratos,
   pero permitiría cambiar datos desde caminos que no comprueban las mismas reglas.
2. Shipping y Reporting como servicios propios: permitiría evaluar releases y
   recursos independientes, pero añade transporte, compatibilidad, seguridad,
   observación y recuperación sin una necesidad demostrada en este ejercicio.
3. Consulta calculada sobre registros en vez de proyección: alternativa razonable
   para una aplicación pequeña. Aquí se conserva la proyección para estudiar lag,
   replay y reconstrucción, no por rendimiento medido.

## Consecuencias

No hay despliegue independiente ni aislamiento entre estos módulos. Un fallo de
proceso afecta a ambos y se pierden memoria y cursores. Las pruebas HTTP observan
timeouts, estado inválido y traducción; no prueban una red entre máquinas, TLS,
Stripe sandbox, resiliencia operativa o una base de datos durable.

No se han medido throughput, latencia, coste cloud o complejidad de equipo. No usar
esta ADR como comparación experimental monolito/microservicios.

## Señales para revisar

- Necesidad observada de publicar Reporting sin coordinar su release con Shipping.
- Perfil de carga medido que justifique aislar recursos y no se resuelva con cambios locales.
- Requisito concreto de aislamiento operativo o de datos que el despliegue actual no satisfaga.

La señal abre una nueva decisión. La extracción requeriría diseñar compatibilidad,
ownership, progreso de proyección, recuperación y rollback antes de ejecutarse.
