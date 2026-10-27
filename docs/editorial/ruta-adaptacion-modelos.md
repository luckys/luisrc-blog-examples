# Adaptar modelos sin dar por ganada la transferencia

Serie P104 en español, draft, independiente de PaySafe. Público: lectores que ya entrenaron una red y siguieron P103; el laboratorio usa un MLP pequeño para aislar la adaptación, no un LLM.

1. **Self-supervision: aprender a reconstruir antes de pedir etiquetas** (`P104`): Cómo convertir observaciones sin etiquetas en pares de entrenamiento sin filtrar el target.
2. **Pretraining y transfer learning: comprobar si empezar con pesos aprendidos ayuda** (`DL-PRETRAINING`): Cómo separar lo aprendido en una tarea previa de la mejora real en la tarea destino.
3. **Contrastive learning: qué acerca los positivos y qué problema plantean los negativos** (`DL-CONTRASTIVE`): Cómo un objetivo contrastivo usa identidades de pares y un denominador de alternativas.
4. **Freeze y unfreeze: qué deja de aprender y cómo volver a entrenarlo** (`DL-FREEZE`): Cómo congelar pesos y reconstruir la participación del optimizer al descongelarlos.
5. **Full fine-tuning: adaptar todos los pesos sin dar por ganada la transferencia** (`DL-FULL-TUNING`): Qué libertad de ajuste ofrece entrenar todo el encoder y qué comparación permite evaluarla.
6. **PEFT: contar parámetros entrenables sin confundirlos con toda la memoria** (`DL-PEFT`): Qué recursos puede ahorrar una adaptación pequeña y cuáles siguen dependiendo del modelo base.
7. **LoRA: adaptar una matriz con dos factores y comprobar su merge** (`DL-LORA`): Cómo una actualización de rango limitado cambia la función sin entrenar la matriz base.
8. **Adapters: añadir una corrección no lineal a una representación congelada** (`DL-ADAPTERS`): Cómo un bottleneck residual aprende una corrección y por qué no equivale a LoRA.
9. **Forgetting: medir qué cambia en la tarea anterior después de adaptar** (`DL-FORGETTING`): Cómo separar degradación con el módulo activo, preservación de pesos y recuperación de la base.

## Criterios de aceptación

Nueve artículos pequeños con extractos ejecutados, un diagrama por mecanismo, figuras generadas desde observaciones y explorador con datos reales. Tres pretrainings y siete estrategias por tres seeds; baseline lineal y mayoría; splits disjuntos con test reservado. Preservar resultados desfavorables y coste previo. La prueba contrastiva es de cálculo/gradiente, no entrenamiento SimCLR. No afirmar ahorro medido de VRAM o tiempo. P105 requiere GPU real.

## Protocolo fijado antes de ejecutar

Ver `packages/model-adaptation/protocol.json`.

- Datos sintéticos: ocho features, dos informativas con frontera lineal, seis
  nuisance; target desplaza las nuisance +0.6.
- Source train 800 / validation 160 / test 256; target 96 / 128 / 256.
- Seeds de datos 1000–1002 / 2000–2002, independientes de modelo 7 / 19 / 31.
- Pretraining: denoising con ruido gaussiano 0.2, 400 steps, Adam 0.003, batch 64.
- Adaptación: 160 steps, Adam 0.01, batch 32, unfreeze tras 80 steps.
- Último checkpoint; sin elección por validation. Sus curvas explican el
  aprendizaje, sin ajustar la configuración después de observarlas.
- Test solo tras finalizar todos los optimizers.

No es estudio causal de algoritmos óptimos: siete estrategias con mismo presupuesto de updates downstream, capacidad distinta y pretraining adicional. Un baseline lineal es apropiado porque la tarea sintética es lineal por construcción. No cambiar el benchmark para fabricar una victoria de la transferencia.
