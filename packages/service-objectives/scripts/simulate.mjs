import { readFile, writeFile, mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { sourceHashes } from './hashes.mjs'
import { buildReport } from '../src/report.ts'
import { scenarios } from '../src/simulation.ts'
import { httpEvents, operations } from '../src/fixtures.ts'
const root = new URL('../', import.meta.url)
const before = await sourceHashes()
const report = buildReport()
assert.deepEqual(await sourceHashes(), before)
const objective = JSON.parse(await readFile(new URL('spec/objectives.json', root)))
const evidence = { simulation: true, generatedAt: new Date().toISOString(), node: process.version, sources: before, report }
await mkdir(new URL('evidence/', root), { recursive: true })
await writeFile(new URL('evidence/simulation.json', root), JSON.stringify(evidence, null, 2) + '\n')
await writeFile(new URL('scenarios.json', root), JSON.stringify({ simulation: true, objective, scenarios, httpEvents, operations }, null, 2) + '\n')
await build({ entryPoints: [new URL('src/model.ts', root).pathname], outfile: new URL('model.mjs', root).pathname,
  bundle: true, platform: 'browser', format: 'esm', target: 'es2023', minify: false })
const fast = report.scenarios.find((s) => s.id === 'fast-burn')
const points = fast.timeline.map((point, i) => {
  const pair = point.pairs[0]
  return `${40 + i * 0.82},${245 - (pair.longBurn ?? 0) * 5}`
}).join(' ')
await writeFile(new URL('burn-rate.svg', root), `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="335" viewBox="0 0 380 335" role="img" aria-labelledby="title desc">
<title id="title">Burn rate largo del escenario rápido</title>
<desc id="desc">Simulación de mil solicitudes por minuto y quince por ciento de errores en los diez minutos finales; el burn rate de una hora cruza14.4.</desc>
<rect width="380" height="335" fill="#111827"/><g font-family="sans-serif" font-size="14" fill="#e5e7eb">
<text x="15" y="25">Simulación · burn rate de 1 h</text><text x="15" y="50">15 % de errores durante 10 min</text>
<path d="M40 90V245H340" fill="none" stroke="#94a3b8"/><text x="8" y="98">30×</text><text x="15" y="247">0×</text>
<path d="M40 ${245 - 14.4 * 5}H340" stroke="#fbbf24" stroke-dasharray="5 4"/>
<polyline points="${points}" fill="none" stroke="#60a5fa" stroke-width="3"/><text x="45" y="165" fill="#fbbf24">threshold 14.4×</text>
<text x="15" y="268">−360 min</text><text x="292" y="268">ahora</text><text x="15" y="295">Dos ventanas deben superar el umbral.</text><text x="15" y="318">Sin tráfico real ni alerta desplegada.</text></g></svg>\n`)
console.log(JSON.stringify({ http: report.http, cohorts: report.cohorts.map(({ now, eligible, good }) => ({ now, eligible, good })), scenarios: report.scenarios.map(({ id, budget, alerts }) => ({ id, bad: budget?.bad, remaining: budget?.remaining, severity: alerts.severity, fastState: alerts.pairs[0].state })) }, null, 2))
