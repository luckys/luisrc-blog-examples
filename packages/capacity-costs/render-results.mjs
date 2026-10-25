import { readFile, writeFile } from 'node:fs/promises'
const report = JSON.parse(await readFile('comparison.json'))
const cases = report.results.cases.map(c=>({ id:c.id, ideal:BigInt(c.result.subtotal), fixed:BigInt(c.result.subtotal)-BigInt(c.result.lines.compute)+BigInt(c.result.staticCompute) }))
const max=Math.max(...cases.flatMap(c=>[Number(c.ideal),Number(c.fixed)]))
const money=n=>(Number(n)/1000000).toFixed(2).replace('.',',')
let body=''
for(const [i,c] of cases.entries()) {
 const y=80+i*100
 body+=`<text x="20" y="${y-12}">${report.input.profiles[i].name}</text>`
 for(const [j,key] of ['ideal','fixed'].entries()) body+=`<rect x="20" y="${y+j*30}" width="${(240*Number(c[key])/max).toFixed(2)}" height="18" fill="${j?'#c4b5fd':'#38bdf8'}"/><text x="${26+240*Number(c[key])/max}" y="${y+j*30+14}">${money(c[key])}</text>`
}
await writeFile('cost-scenarios.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 425" role="img" aria-label="Subtotales parciales calculados con tarifas ficticias. Ajuste ideal por franjas frente a mantener siempre el pico."><rect width="380" height="425" fill="#0f172a"/><g font-family="system-ui" font-size="12" fill="#e2e8f0"><text x="20" y="24" font-size="15">Modelo mensual, tarifas ficticias</text><text x="20" y="44">USD; excluye DB, operación y otras partidas</text>${body}<text x="20" y="390" fill="#38bdf8">Azul: réplicas ideales por franja</text><text x="20" y="410" fill="#c4b5fd">Violeta: pico permanente</text></g></svg>\n`)
