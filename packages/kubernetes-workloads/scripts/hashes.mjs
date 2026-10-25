import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
export async function hashes() {
  const files = ['package.json', 'tools.json', 'Dockerfile', 'Dockerfile.dockerignore']
  for (const dir of ['app', 'scripts', 'tests', 'manifests']) for (const name of (await readdir(dir)).sort()) files.push(dir + '/' + name)
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file, createHash('sha256').update(await readFile(file)).digest('hex')])))
}
