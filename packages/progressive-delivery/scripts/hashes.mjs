import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
export async function hashes() {
  const files = ['package.json', 'tsconfig.json', 'Dockerfile', 'Dockerfile.dockerignore', 'compose.yaml',
    '../../pnpm-lock.yaml', '../../pnpm-workspace.yaml', '../../package.json']
  for (const dir of ['src', 'scripts', 'tests', 'sql', 'variants'])
    for (const name of (await readdir(dir)).sort()) files.push(`${dir}/${name}`)
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file,
    createHash('sha256').update(await readFile(file)).digest('hex')])))
}
