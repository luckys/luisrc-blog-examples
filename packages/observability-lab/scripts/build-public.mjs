import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const root = new URL('../', import.meta.url)
const evidence = JSON.parse(await readFile(new URL('evidence/browser.json', root)))
for (const [file, hash] of Object.entries(evidence.sources)) {
  assert.equal(createHash('sha256').update(await readFile(new URL(file, root))).digest('hex'), hash, file)
}
const publicData = { measuredAt: evidence.measuredAt, node: evidence.node, otel: evidence.otel,
  cases: evidence.cases, metrics: evidence.metrics, limits: evidence.limits }
await writeFile(new URL('measurements.json', root), JSON.stringify(publicData, null, 2) + '\n')
const rows = evidence.cases.map((entry, i) => {
  const y = 75 + i * 58
  const spans = entry.spans.length
  const traces = new Set(entry.spans.map((span) => span.traceId)).size
  return `<text x="18" y="${y}" fill="#e5e7eb">${entry.scenario}</text><rect x="115" y="${y - 15}" width="${spans * 34}" height="22" fill="#60a5fa"/><text x="${122 + spans * 34}" y="${y}" fill="#e5e7eb">${spans} spans</text><text x="115" y="${y + 20}" fill="#cbd5e1">${traces} ${traces === 1 ? 'traza exportada' : 'trazas exportadas'} · 1 job medido</text>`
}).join('')
await writeFile(new URL('signals.svg', root), `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="420" viewBox="0 0 380 420" role="img" aria-labelledby="title desc"><title id="title">Spans exportados por escenario</title><desc id="desc">Los cuatro escenarios muestreados exportan cinco spans; unsampled no exporta ninguno. Las cinco operaciones se incluyen en las métricas.</desc><rect width="380" height="420" fill="#111827"/><g font-family="sans-serif" font-size="14"><text x="18" y="30" fill="#f8fafc" font-size="17">Cinco clics reales desde React</text>${rows}<text x="18" y="390" fill="#cbd5e1">Fixture local · no mide capacidad</text></g></svg>\n`)
console.log('Datos y gráfica derivados de evidencia verificada')
