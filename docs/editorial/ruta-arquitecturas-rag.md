# P115: diseñar una arquitectura RAG desde el problema

Estado: nueve borradores españoles verificados. Capturas reales de aislamiento, conversaciones, multi-step, caché, actualizaciones y conteo de contexto; cierre conceptual RAG/fine-tuning con descriptores sin generación. Ver rag-architecture-review.md y manifiesto. Prerrequisitos del roadmap:
P112, P113 y P114. Solo español, borradores, autor Luis Ramírez Calle. Laboratorios
en el monorepo de ejemplos, nunca dentro del blog. Dependencias mediante pnpm.

## Desglose propuesto

| Orden | ID propuesto | Decisión central |
| --- | --- | --- |
| 1 | P115 | Qué requisitos cambian el diseño de un RAG y qué contratos unen sus etapas |
| 2 | RAG-TENANTS | Dónde aplicar identidad, permisos y elegibilidad antes de exponer texto |
| 3 | RAG-ISOLATION | Qué cambia entre índice global filtrado y aislamiento físico por tenant |
| 4 | RAG-CONVERSATION | Cómo conservar contexto conversacional sin mezclar identidades o fuentes |
| 5 | RAG-MULTISTEP | Cuándo otro paso de recuperación aporta evidencia y cómo limitar el recorrido |
| 6 | RAG-CACHE | Qué incluir en la clave de caché y cómo evitar respuestas de otro ámbito o revisión |
| 7 | RAG-UPDATES | Cómo construir, comprobar y activar un índice nuevo sin alterar citas antiguas |
| 8 | RAG-CONTEXT-DESIGN | Cómo organizar instrucciones, historial y evidencia con un presupuesto verificable |
| 9 | RAG-VS-FINETUNING | Qué cambia al recuperar fuentes o adaptar parámetros y cómo combinar ambas intervenciones |

Evitar repetir las series anteriores sin una nueva pregunta. Separar conceptos si
el mecanismo, el caso de fallo o las pruebas necesitan más espacio. Cada entrega
incluirá código inline ejecutable, laboratorio externo, decisiones, diagrama, figuras
estáticas, visualización interactiva, errores, límites, ejercicio y fuentes primarias.

## Laboratorio exigido por P115

Diseñar un RAG multi-tenant y comparar indexación global filtrada frente a aislamiento
físico. Tiene que haber evidencia de las dos alternativas, no solo un diagrama o un
test de una función de routing. Elegir motor y versiones antes de medir. Utilizar
datos sintéticos con identidades y permisos explícitos; evitar documentos privados.

Registrar consultas, ámbito permitido, candidatos, documentos visibles, fuentes y
caché. Comparar corrección y recuperación dentro del conjunto autorizado, además de
la existencia de resultados. Un ranking mejor no justifica exposición de otro tenant.

Un filtro de tema o idioma no es una política de autorización. Comprobar aplicación
del ámbito en retrieval, conversaciones, contexto, citas y caché. Si se usa RLS,
validar con roles efectivos y casos de acceso denegado; no ejecutar todo como un rol
que pueda saltarse la regla y tratarlo como prueba de aislamiento.

## Contrato previo a las capturas

1. Corpus, identidades, permisos, versiones y consultas gold fijados antes de comparar.
   Conservar los casos donde la consulta intenta referirse al documento de otro tenant.
2. Misma información y configuración de ranking en las dos alternativas de indexación.
   Explicar las estadísticas y límites que cambian al particionar; no inventar igualdad
   de resultados si el motor calcula frecuencias o vecindarios diferentes.
3. Contexto conversacional ligado a identidad y ámbito, sin recuperar una referencia
   antigua que ya no sea elegible. Resolver ambigüedades mediante un contrato explícito.
4. Multi-step con condición de avance y parada, límites y trazas. Variantes redactadas
   se identifican como tales; ninguna llamada LLM se afirma si no se ejecutó realmente.
5. Caché diferenciada por tenant, ámbito efectivo, consulta/configuración y revisión
   aplicables. Probar cambios de permisos y versión, hit/miss e invalidación sin mezclar
   autorización con semejanza de texto. No afirmar latencia o coste no medidos.
6. Construcción de índice nuevo, comprobación y cambio de referencia observables.
   Verificar qué pasa con consultas concurrentes, fallos y citas de una revisión previa.
7. Context design conserva instrucciones y fuentes como categorías distintas. Conteo
   con tokenizer real si se hacen afirmaciones de capacidad; no recorte silencioso.
8. RAG vs fine-tuning con objetivos concretos: actualización y acceso a hechos frente a
   comportamiento aprendido, incluyendo combinaciones. No prometer que fine-tuning
   elimina necesidad de fuentes o que RAG corrige cualquier comportamiento del modelo.

## Límite heredado que debe permanecer visible

P114 ejecutó 61 generaciones únicas y ninguna cumplió el contrato (58JSON inválidos,
3estados incoherentes). Hay evidencia de reranking y enlaces, no de un generador útil
grounded ni de abstención conforme. Ese límite está en su manifiesto y revisión.

Los tests de arquitectura, permisos e indexación pueden verificarse por separado,
pero no convierten esta cadena en un RAG de respuestas funcional. Si se necesita
demostrar generación útil, plantear un experimento nuevo con protocolo/modelos/prompt
fijados antes, conservar la captura fallida y evaluar todas las salidas. No sustituir
respuestas reales por redactadas ni ocultar errores con un parser más permisivo.

## Cierre de la serie

Auditar temario y laboratorio contra la ficha, fuentes/modelos/datos por hashes,
trazas y métricas reproducibles. Pruebas de acceso y revisiones con roles reales,
conservando regresiones. Artículos y ejemplos coherentes. QA móvil/escritorio con
fuentes, diagramas y gráficos legibles, controles por teclado y sin desbordamiento.
Build y enlaces. No publicar, traducir, generar audio, hacer commit ni push de forma
automática. El objetivo completo de175fichas sigue pendiente de auditoría.
