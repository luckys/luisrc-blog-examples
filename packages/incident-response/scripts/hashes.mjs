import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
export async function sourceHashes() {
  const hashes = {}
  for (const dir of ['src', 'scripts', 'tests', 'docs'])
    for (const file of (await readdir(new URL(`../${dir}/`, import.meta.url))).toSorted())
      hashes[`${dir}/${file}`] = createHash('sha256').update(await readFile(new URL(`../${dir}/${file}`, import.meta.url))).digest('hex')
  return hashes
}
