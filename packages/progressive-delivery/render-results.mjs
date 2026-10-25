import { readFile, writeFile } from 'node:fs/promises'
const evidence = JSON.parse(await readFile('evidence/delivery.json'))
const samples = evidence.events.find((e) => e.id === 'canary_exposed').facts.samples
const groups = [['Control', samples.filter((s) => s.slot !== 'green')], ['Candidato', samples.filter((s) => s.slot === 'green')]]
let parts = ''
for (const [i, [name, rows]] of groups.entries()) {
  const y = 70 + i * 164, http = rows.filter((s) => s.status === 200).length, good = rows.filter((s) => !s.bad).length
  parts += `<text x="18" y="${y}" font-size="17" font-weight="700">${name}: ${rows.length} respuestas</text>`
  for (const [j, [label, value, color]] of [['HTTP 200', http, '#38bdf8'], ['Precio correcto', good, '#34d399']].entries()) {
    const top = y + 24 + j * 60
    parts += `<text x="18" y="${top}" font-size="14">${label}: ${value}/${rows.length}</text><rect x="18" y="${top + 10}" width="344" height="18" fill="#1e293b" stroke="#64748b"/><rect x="18" y="${top + 10}" width="${(344 * value / rows.length).toFixed(2)}" height="18" fill="${color}"/>`
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 440" role="img" aria-labelledby="title desc"><title id="title">HTTP y resultado del precio en el canary</title><desc id="desc">Control: 180 respuestas HTTP 200 y 180 precios correctos. Candidato: 20 respuestas HTTP 200 y ningún precio correcto. Escala común de cero a cien por ciento en cada grupo.</desc><rect width="380" height="440" rx="12" fill="#0f172a"/><g font-family="system-ui,sans-serif" fill="#f8fafc"><text x="18" y="30" font-size="18" font-weight="700">HTTP 200 no valida el precio</text>${parts}<text x="18" y="410" font-size="13">Muestra sintética. Escala de 0 a 100 %.</text></g></svg>`
await writeFile('canary-outcomes.svg', svg + '\n')
console.log('Gráfico derivado de las 200 respuestas archivadas')
