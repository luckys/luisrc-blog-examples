# CI/CD: entregar cambios y conservar una vuelta atrás

Catálogo de productos ficticios con precios en céntimos. No hay pagos ni datos
de usuarios. Regresión intencional de lectura al activar una flag: 10000 pasa a 100
y sigue llamándose priceCents. Nunca usar este candidato en una aplicación real.

## Entorno y comandos desde la raíz del monorepo

Node.js 24.19.0, pnpm 12.8.1, Docker Engine con BuildKit y Compose compatible con
up --wait. Probado en Linux amd64, Engine 29.9.2 y Compose 5.6.1. Puede descargar
images/paquetes y consulta el registry público para pnpm audit.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/progressive-delivery run test
pnpm --filter @luisrc-examples/progressive-delivery run typecheck
pnpm --filter @luisrc-examples/progressive-delivery run ci:local
pnpm --filter @luisrc-examples/progressive-delivery run exercise
pnpm --filter @luisrc-examples/progressive-delivery run verify
```

`test`: siete tests, sin Docker; seis de reglas y uno con router/HTTP/IPC reales.
`ci:local`:tests, tipos, compilación, artefacto temporal pnpm deploy --prod, audit
runtime y dos builds multi-stage e inspección de política. Ocho etapas locales.
El audit falla ante error del registry; no ignora advisories. No es scan del SO.
`exercise` incluye ci:local y el recorrido completo. No hace falta ejecutar ambos
si solo quieres una captura nueva. `verify` contrasta archivo/hashes, sin Docker.
Usa `run ci:local`, evitando el comando pipeline incorporado de pnpm 12.

No ejecutar exercises concurrentes de este paquete: escriben los mismos archivos.
No requiere activar un workflow remoto, credenciales cloud, registry privado o
servicio de flags. No se creó .github/workflows en el repositorio.

## Artefactos, servicios y confianza

Dos images comparten servidor compilado; cada una incorpora release.json durante
build desde variants/stable.json o variants/candidate.json. Esa configuración
queda dentro de la image y no se cambia con env de runtime. La flag del router
es otra decisión, registrada por revisión y enviada como cabecera interna.

Pipeline consulta el image ID local; Compose usa ese ID con pull_policy:never.
No es un manifest publicado ni un build bit reproducible. La política exige user
node/1000, referencia base fijada y cero hallazgos high/critical de audit runtime.
El artefacto candidato sigue marcado como fixture negativo, sin promoción real.

PostgreSQL compartido, tres servicios API: a, b, green; puertos aleatorios loopback.
Backend interna, API read-only/no-new-privileges/capabilities retiradas. Un router
Node en proceso hijo del harness dirige GET, con control privado IPC y destinos
solo HTTP 127.0.0.1 normalizados. No es un reverse proxy de producción.
Escrituras de control se hacen directamente a los servicios por el harness.
Cabeceras de flag del cliente no sustituyen la decisión del router. Las claves
de cohortes son sintéticas y no representan autorización ni identidad autenticada.

## Dieciocho fases observadas

1. Pipeline y sus ocho etapas, audit y dos IDs.
2. Esquema inicial y smoke estable de 10000/99 céntimos.
3. Expand añade display_name nullable, mantiene name; v1 crea otra fila.
4. Green preparado sin tráfico del router; lee la fila creada por v1 con fallback.
5. Smoke de candidato con flag apagada pasa; no valida la rama nueva.
6. Rolling reemplaza a; conviven v2/v1 y se inspeccionan ambas images.
7. Rolling reemplaza b; ambas v2, flag off.
8. Antes del experimento blue-green se prepara blue de nuevo con v1. Captura
   lecturas v1 y después conmutación a green v2; smoke pasa con flag off.
9. Blue se conserva y se recupera seleccionando su ruta; respuestas v1 correctas.
10. Canary 10 %: dos claves por cada bucket, 200 lecturas, 20 malas del candidato y
    180 correctas del control; todas 200. Muestra sintética estratificada.
11. Gate decide rollback y smoke vuelve a pasar contra blue.
12. Prueba negativa **forzada**, que el gate normal no promovería:green con flag
    on; smoke detecta 100/1 en vez de 10000/99 aunque los status son 200.
13. Flag off restaura lecturas, sin cambiar image candidata.
14. Candidato crea new-from-v2 escribiendo ambas columnas; snapshot de cuatro filas.
15. Green vuelve al image ID estable; v1 lee la fila de v2, smoke correcto.
16. Contract prematuro de name ensayado dentro de transacción:consulta antigua
    falla con 42703, ROLLBACK; columnas y filas siguen iguales.
17. V1 admite otra escritura; cinco filas, cuatro anteriores conservadas y smoke.
18. Router cerrado y ausencia de containers/volúmenes/redes del proyecto propio.

La preparación blue-green es otro experimento tras el rolling, no una supuesta
convivencia v1/v2 si ambos slots hubieran seguido en v2. El router refresca puertos
después de recreaciones; no asume que un puerto aleatorio permanece igual.

## Datos y limpieza

El harness marca propiedad del proyecto solo después de confirmar etiquetas
vacías, y elimina sus recursos en finally. No hay prune global, volúmenes externos
ni nombres globales de containers. Conserva images propias; IDs/tags en evidencia.
No maneja un proyecto aportado por el usuario ni toca bases ajenas. Contraseña
SQL pública y desechable; no es una configuración de permisos de producción.

`.artifacts/` guarda logs, resultado del pipeline y checkpoint parcial ignorados.
Un fallo no sobrescribe evidence/delivery.json final anterior; comprueba fecha y
checkpoint. No promete fsync, atomicidad o recuperación de un corte de escritura.

La captura contiene 26 hashes de fuentes/variants/SQL/tests/scripts/entradas raíz.
Si cambia lockfile, configuración raíz o una fuente, repetir exercise. Después,
desde esta carpeta: `node render-results.mjs`; sincroniza exports desde la raíz
del monorepo con `BLOG_ROOT=/ruta/al/blog node scripts/sync-blog-assets.mjs`.
El generador de gráfica y el visor están fuera de los inputs de ejecución Docker;
sus exports se verifican por provenance y pruebas editoriales independientes.

## Límites

Probes secuenciales en una máquina, sin disponibilidad continua, Kubernetes,
tráfico de usuarios, latencias de producción o significancia estadística. Política
de canary de 20 observaciones/1 % es didáctica, no justificación universal de muestra.
No hay registry push, firmas, scan del SO, pipeline remoto, backup restore,
migración masiva o contract destructivo confirmado. La regresión no modifica
precios persistidos; no se reparan efectos externos. Productos inmutables:
actualizaciones exigirían resolver divergencia de columnas en dual write.
