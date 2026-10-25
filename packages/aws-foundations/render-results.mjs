import { readFile, writeFile } from 'node:fs/promises'
const data = JSON.parse(await readFile('comparison.json'))
const max = Math.max(...data.cases.flatMap((c) => [c.result.lambda.subtotal, c.result.ecs.subtotal]))
const money = (v) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
let rows = ''
for (const [i, c] of data.cases.entries()) {
  const y = 72 + i * 174
  rows += `<text x="20" y="${y}" font-size="17" font-weight="700">${i ? '100 millones; tasks 1 vCPU / 2 GB' : '1 millón; tasks 0,25 vCPU / 0,5 GB'}</text>`
  for (const [j, key] of ['lambda', 'ecs'].entries()) {
    const value = c.result[key].subtotal, top = y + 30 + j * 62
    rows += `<text x="20" y="${top}" font-size="15">${key === 'lambda' ? 'Lambda + HTTP API' : 'ECS + ALB + red'}: ${money(value)} USD</text><rect x="20" y="${top + 10}" width="340" height="20" rx="3" fill="#273449"/><rect x="20" y="${top + 10}" width="${(340 * value / max).toFixed(2)}" height="20" rx="3" fill="${j ? '#a78bfa' : '#38bdf8'}"/>`
  }
}
const description = data.cases.map((c) => `${c.id}: Lambda ${c.result.lambda.subtotal} USD; ECS ${c.result.ecs.subtotal} USD`).join('. ')
await writeFile('cost-summary.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 480" role="img" aria-labelledby="title desc"><title id="title">Subtotales parciales, no rendimiento</title><desc id="desc">${description}. Misma escala desde cero. Shapes distintas entre escenarios. Capacidad equivalente no probada.</desc><rect width="380" height="480" rx="12" fill="#0f172a"/><g font-family="system-ui,sans-serif" fill="#f8fafc"><text x="20" y="30" font-size="18" font-weight="700">Infraestructura modelada · USD</text>${rows}<text x="20" y="420" font-size="14">Escala común; tarifas us-east-1.</text><text x="20" y="442" font-size="14">DB, logs, transferencias y TCO excluidos.</text><text x="20" y="464" font-size="14">Capacidad equivalente no probada.</text></g></svg>\n`)
console.log('Gráfica derivada de los dos escenarios, sin afirmar capacidad')
