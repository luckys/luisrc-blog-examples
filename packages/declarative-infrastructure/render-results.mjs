import { readFile, writeFile } from 'node:fs/promises'
const evidence = JSON.parse(await readFile('evidence/terraform.json'))
const cases = [['create_planned', 'Creación inicial'], ['drift_detected', 'Actualizar tras drift'], ['replacement_planned', 'Reemplazo de configuración'], ['destroyed_owned_resources', 'Teardown del namespace']].map(([id, label]) => {
  const facts = evidence.events.find((e) => e.id === id).facts
  return { id, label, counts: (facts.plan ?? facts).counts }
})
const max = Math.max(...cases.flatMap((c) => [c.counts.create, c.counts.update, c.counts.delete]))
let rows = ''
for (const [i, c] of cases.entries()) {
  const y = 80 + i * 88
  rows += `<text x="16" y="${y}" font-size="16" font-weight="700">${c.label}</text>`
  for (const [j, [key, label, color]] of [['create', 'Crear', '#38bdf8'], ['update', 'Act.', '#a78bfa'], ['delete', 'Borrar', '#fb7185']].entries()) {
    const top = y + 18 + j * 18
    rows += `<text x="16" y="${top + 10}" font-size="12">${label}: ${c.counts[key]}</text><rect x="85" y="${top}" width="279" height="12" fill="#273449"/><rect x="85" y="${top}" width="${(279 * c.counts[key] / max).toFixed(2)}" height="12" fill="${color}"/>`
  }
}
const desc = cases.map((c) => `${c.id}: crear ${c.counts.create}, actualizar ${c.counts.update}, borrar ${c.counts.delete}, reemplazar ${c.counts.replace}`).join('. ')
await writeFile('plan-actions.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 470" role="img" aria-labelledby="title desc"><title id="title">Acciones de cuatro planes locales</title><desc id="desc">${desc}. Misma escala desde cero. Un reemplazo incluye crear y borrar.</desc><rect width="380" height="470" rx="12" fill="#0f172a"/><g font-family="system-ui,sans-serif" fill="#f8fafc"><text x="16" y="28" font-size="18" font-weight="700">Qué propone cambiar Terraform</text><text x="16" y="50" font-size="13">Contadores de acciones, no tiempos.</text>${rows}<text x="16" y="450" font-size="13">Reemplazar suma crear y borrar. Escala0–${max}.</text></g></svg>\n`)
console.log('SVG derivado de los cuatro planes archivados')
