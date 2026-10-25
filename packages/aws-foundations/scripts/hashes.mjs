import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
export async function hashes() {
  const files = ['package.json', 'tsconfig.json', 'scenarios.json', 'cost-model.mjs']
  for (const dir of ['src', 'scripts', 'tests', 'pricing', 'designs'])
    for (const name of (await readdir(dir)).sort()) files.push(`${dir}/${name}`)
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file,
    createHash('sha256').update(await readFile(file)).digest('hex')])))
}
