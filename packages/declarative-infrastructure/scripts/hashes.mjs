import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
export async function hashes() {
  const files = ['package.json', 'Dockerfile', 'Dockerfile.dockerignore', 'tools.json']
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === '.terraform') continue
      const file = dir + '/' + entry.name
      if (entry.isDirectory()) await walk(file)
      else if (/\.(?:tf|hcl|mjs)$/.test(entry.name)) files.push(file)
    }
  }
  for (const dir of ['app', 'scripts', 'tests', 'terraform']) await walk(dir)
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file, createHash('sha256').update(await readFile(file)).digest('hex')])))
}
