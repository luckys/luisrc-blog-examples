import { mkdir, writeFile } from 'node:fs/promises'
export async function saveCheckpoint(target: URL, events: readonly unknown[]) {
  await mkdir(new URL('./', target), { recursive: true })
  await writeFile(target, JSON.stringify({ kind: 'checkpoint_not_final_report', events }, null, 2) + '\n')
}
