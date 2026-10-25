import {readFile,writeFile}from'node:fs/promises'
import{lossChart,heatmap,activationChart}from'./charts.mjs'
const data=JSON.parse(await readFile('training.json'))
await writeFile('training-curves.svg',lossChart(data.results.cases)+'\n')
await writeFile('activations.svg',activationChart('tanh',0,true)+'\n')
const cases=['linear','mlp-7'].map(id=>data.results.cases.find(c=>c.id===id))
const maps=cases.map(c=>heatmap(data,c,c.history.at(-1)).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,''))
await writeFile('decision-maps.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 930" role="img" aria-label="Mapas finales de regresión logística y MLP seed 7. Mismos puntos de validation y escala; fuera de las cajas hay inferencia sin evaluación."><g>${maps[0]}</g><g transform="translate(0 470)">${maps[1]}</g></svg>\n`)
