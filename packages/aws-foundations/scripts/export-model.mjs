import { readFile, writeFile } from 'node:fs/promises'
await writeFile('cost-model.mjs', await readFile('dist/costs.js'))
console.log('Modelo TypeScript compilado y compartido con el visor')
