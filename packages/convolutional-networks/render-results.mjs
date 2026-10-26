import{readFile,writeFile}from'node:fs/promises'
import{curve,heatmap}from'./charts.mjs'
const d=JSON.parse(await readFile(new URL('comparison.json',import.meta.url)))
const source=d.runs.find(r=>r.id==='source-7')
await writeFile(new URL('source-curves.svg',import.meta.url),curve(['trainLoss','validationLoss'].map(name=>({name,points:source.history.map(p=>({x:p.epoch,y:p[name]}))})),'Source · cuatro orientaciones · seed 7'))
await writeFile(new URL('transfer-curves.svg',import.meta.url),curve(d.protocol.targetModes.map(name=>({name,points:d.runs.find(r=>r.id===`${name}-7`).history.map(p=>({x:p.epoch,y:p.validationLoss}))})),'Target · validation loss · seed 7').replace('height="310"','height="326"').replace('0 0 380 310','0 0 380 326'))
const stage='conv1_relu',hi=Math.max(...d.features.flatMap(f=>f.maps[stage].flat(2)))
const panels=d.features.map((f,i)=>`<g transform="translate(${10+i%2*190},${40+Math.floor(i/2)*216})"><text x="0" y="0" fill="#e2e8f0" font-size="14">${d.protocol.classes[f.label]}</text><svg x="0" y="12" width="170" height="170" viewBox="0 0 288 288">${heatmap(f.maps[stage][0],{hi}).match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1]}</svg></g>`).join('')
await writeFile(new URL('feature-maps.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="380" height="496" viewBox="0 0 380 496" role="img" aria-label="Conv1 tras ReLU, canal 0, cuatro imágenes de validation"><rect width="100%" height="100%" fill="#0f172a"/><g font-family="sans-serif"><text x="10" y="20" fill="#e2e8f0" font-size="14">Conv1 ReLU · canal 0 · source seed 7</text>${panels}<text x="10" y="478" fill="#e2e8f0" font-size="14">Escala compartida: 0 a ${hi.toFixed(3)}</text></g></svg>`)
console.log('Tres figuras generadas desde observaciones archivadas')
