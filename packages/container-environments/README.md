# Docker: construir y comprobar un entorno reproducible

API de notas ficticias e inmutables, PostgreSQL como fuente persistente y Redis
como cache de lecturas. No es una aplicación de pagos ni maneja datos reales.
Código completo de los seis artículos españoles de P062.

## Requisitos y comandos desde la raíz del monorepo

Node.js 24.19.0, pnpm 12.8.1 y Docker con Compose. La captura usa Linux amd64,
Engine 29.9.2 y Compose 5.6.1. Necesita un Docker compatible con BuildKit,
`up --wait`, healthchecks y el formato Compose utilizado. Otros entornos no se
han verificado. Primera ejecución puede descargar images y paquetes públicos.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/container-environments test
pnpm --filter @luisrc-examples/container-environments typecheck
pnpm --filter @luisrc-examples/container-environments exercise
pnpm --filter @luisrc-examples/container-environments verify
```

`test` son cinco tests sin Docker; `typecheck` usa TypeScript strict. `exercise`
construye y levanta servicios reales, con nombre de proyecto aleatorio. Comprueba
que no existan recursos previos con su etiqueta, detiene/recrea solo sus servicios
y elimina sus containers, redes y volúmenes en finally. No ejecuta prune global.
Conserva dos images identificadas en la última fase, no las publica en un registry.
No ejecutar varios exercises simultáneos: escriben el mismo archivo de evidencia.

## Qué se observa en las diez fases

1. Build de runtime y stage build en copia temporal. Un comentario cambiado en
   source deja `pnpm install` CACHED en BuildKit; no cambia el checkout.
2. Primer setup: cero filas SQL. Se inspecciona red interna, puertos, montajes,
   UID 1000, filesystem raíz read-only, capabilities y recursos de la API.
3. POST crea una nota; GET obtiene SQL y luego Redis; repetir ID devuelve 409.
4. Reemplazar API cambia container ID y mantiene image ID y nota.
5. Redis detenido: GET recurre a PostgreSQL, readiness 200/cache desconectada.
6. PostgreSQL detenido: liveness 200, readiness 503 y lectura fuera de cache 503.
7. PostgreSQL recuperado: nota y readiness válidas.
8. `down` sin volumes y nuevo `up`: se conserva la nota, lectura desde SQL.
9. `down --volumes` y nuevo `up`: cero filas, nota anterior 404, creación y lectura
   nuevas válidas. Es un segundo setup vacío de datos, no un builder sin cache.
10. Se confirma ausencia de containers, redes y volúmenes propios tras limpieza.

El timestamp UTC y elapsedMs son observaciones del harness, no duración interna
de una consulta ni benchmark. `evidence/compose.json` contiene versiones, hashes
de quince entradas incluidas configuración/lock raíz, IDs y hechos verificados.
`verify` compara captura con fuentes actuales y sus invariantes: no inicia Docker.
`.artifacts/` guarda logs y checkpoint parcial, ignorados. Un fallo no sobrescribe
la captura final anterior: consulta los logs y el checkpoint antes de interpretarla.
No se promete escritura atómica del checkpoint ni recuperación ante corte de energía.

## Arranque manual, desde esta carpeta

```bash
docker compose build
docker compose up -d --wait --no-build
docker compose port api 3000
```

Usa la dirección devuelta para POST /notes con JSON `{ "id": "first-note",
"text": "Nota ficticia" }` y GET /notes/first-note. `/live` solo comprueba HTTP;
`/ready` requiere SELECT 1 SQL y muestra conectividad Redis sin exigirla. PostgreSQL
y Redis no publican puertos. Credencial SQL pública, solo para este fixture.

```bash
docker compose down
```

Conserva pgdata. Para desechar los datos de este proyecto manual:

```bash
docker compose down --volumes
```

El harness usa un proyecto diferente, no toca este arranque manual. No hay `name`
global de volumen ni `container_name` que los haga colisionar.

## Archivos y decisiones

- `Dockerfile`: Node fijado, Corepack/pnpm, instalación filtrada con lock común,
  tsc y pnpm deploy --prod; runtime recibe dist y dependencias, USER node.
- `Dockerfile.dockerignore`: allowlist para el contexto de raíz del monorepo.
- `compose.yaml`: API edge/backend, puertos aleatorios loopback; backend interna;
  PostgreSQL 18.4 con pgdata en /var/lib/postgresql; Redis 8.8.1 sin persistencia.
- `src/notes.ts`: validación de entradas y cache-aside con fallback SQL.
- `src/server.ts`: HTTP, pool/cliente y timeouts; cache offline no encola comandos.
- `sql/01-schema.sql`: init de volumen nuevo; no es un migrador de esquema.
- `scripts/exercise.mjs`: peticiones, fallos, comprobaciones y limpieza propias.
- `render-results.mjs`: genera image-sizes.svg a partir de evidence/compose.json.
- `explorer.*` y `replay.json`: visor estático, no controla Docker. Al regenerar
  evidencia ejecuta `node render-results.mjs` desde esta carpeta y sincroniza
  exports del monorepo con BLOG_ROOT. El gráfico no cambia la captura.

## Garantías y límites

Cinco tests prueban funciones; el exercise prueba servicios HTTP/SQL/Redis reales.
Las notas no se actualizan: ampliar operaciones exige resolver invalidación de
cache. Tiempo de comandos Redis limitado; abortar una espera no promete deshacer
efectos remotos. Redis es prescindible para corrección, sin prueba de capacidad.
La comprobación de readiness no valida todo el esquema; crear/leer lo complementa.

No hay TLS, autorización, secret management de producción, permisos SQL mínimos,
scan de vulnerabilidades, firma, SBOM auditada, backup restore, upgrade mayor,
alta disponibilidad, multi-arch, benchmark o build bit reproducible. No se han
probado límites provocando OOM/throttling ni pérdida del disco. Los controles de
runtime se aplican a la API; no se extienden por inferencia a PostgreSQL/Redis.
