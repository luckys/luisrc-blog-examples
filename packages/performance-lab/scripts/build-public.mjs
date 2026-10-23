import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { percentile } from '../src/statistics.ts'
import { groupWindows } from '../src/windows.ts'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))
const load = JSON.parse(await readFile('evidence/load.json'))
const profiles = JSON.parse(await readFile('evidence/profiles.json'))
const stages = load.stages.map((stage) => ({
  name: stage.plan.name, mode: stage.plan.mode, configuredRate: stage.plan.mode === 'open' ? stage.plan.rate : null,
  vus: stage.plan.vus, nominalSeconds: stage.plan.seconds, measuredSeconds: stage.seconds,
  requests: stage.requests, successes: stage.successes, errors: stage.errors, dropped: stage.dropped,
  completedRps: stage.completedRps, successfulRps: stage.successfulRps,
  all: stage.all, success: stage.success, failed: stage.failed,
  windows: stage.plan.name === 'steady-60s' ? groupWindows(stage.samples).map(({ fromSecond, complete, requests, success, errors }) => ({ fromSecond, complete, requests, success, errors })) : [],
}))
const publicData = { notes: 'HTTP local, procesos distintos, misma máquina. Datos archivados; no envía tráfico.',
  stages, benchmarks: profiles.benchmarks.map((run, process) => ({ process: process + 1,
    slowMedianMs: percentile(run.samples.filter((s) => s.variant === 'slow').map((s) => s.ms), 0.5),
    indexedMedianMs: percentile(run.samples.filter((s) => s.variant === 'indexed').map((s) => s.ms), 0.5) })),
  memory: profiles.memory.map(({ variant, samples }) => ({ variant, entries: samples.map(({ stage, entries }) => ({ stage, entries })) })) }
await writeFile('measurements.json', JSON.stringify(publicData, null, 2) + '\n')
const begin = (title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 430" role="img"><title>${title}</title><rect width="360" height="430" fill="#fff"/><g font-family="sans-serif" fill="#172033"><text x="20" y="33" font-size="18" font-weight="700">${title}</text>`
const end = '</g></svg>'
let loadSvg = begin('Trabajo útil y respuestas de error')
loadSvg += '<text x="20" y="60" font-size="14">Verde: éxitos · rojo: errores · escala 350/s</text>'
const labels = { 'closed-4': 'Closed: 4 VUs', 'open-100': 'Open: 100 llegadas/s', 'open-350-a': 'Open: 350 llegadas/s', 'recovery-25': 'Recuperación: 25 llegadas/s' }
for (const [index, stage] of stages.filter((s) => labels[s.name]).entries()) {
  const y = 96 + index * 73
  const good = stage.successfulRps / 350 * 310
  const bad = (stage.completedRps - stage.successfulRps) / 350 * 310
  loadSvg += `<text x="20" y="${y}" font-size="16">${labels[stage.name]}</text><rect x="20" y="${y + 10}" width="${good}" height="17" fill="#158047"/><rect x="${20 + good}" y="${y + 10}" width="${bad}" height="17" fill="#bc2836"/><text x="20" y="${y + 47}" font-size="14">Éxitos ${stage.successfulRps.toFixed(1)}/s · errores ${(stage.completedRps - stage.successfulRps).toFixed(1)}/s</text>`
}
loadSvg += '<text x="20" y="413" font-size="13">Medición local · no capacidad de producción</text>' + end
await writeFile('load-results.svg', loadSvg)
let memorySvg = begin('Objetos retenidos después de GC')
memorySvg += '<text x="20" y="60" font-size="14">Recuento de RetainedEntry, no RSS</text>'
for (const [index, stage] of ['500', '1500'].entries()) {
  const y = 108 + index * 132
  memorySvg += `<text x="20" y="${y}" font-size="16">Después de ${stage} inserciones</text>`
  for (const [variantIndex, memory] of publicData.memory.entries()) {
    const count = memory.entries.find((s) => s.stage === stage).entries
    const barY = y + 15 + variantIndex * 38
    memorySvg += `<rect x="20" y="${barY}" width="${count / 1500 * 300}" height="16" fill="${variantIndex === 0 ? '#254fc5' : '#158047'}"/><text x="20" y="${barY + 32}" font-size="14">${memory.variant === 'unbounded' ? 'Sin límite' : 'Límite 100'}: ${count} objetos</text>`
  }
}
memorySvg += '<text x="20" y="393" font-size="14">Al retirar referencia: 0 en ambas.</text><text x="20" y="414" font-size="13">Shallow size no suma el payload retenido.</text>' + end
await writeFile('memory-results.svg', memorySvg)
console.log('Public evidence and two SVG charts built from measured data')
