import { readFile, writeFile } from 'node:fs/promises'
const e = JSON.parse(await readFile('evidence/compose.json'))
const { buildBytes, runtimeBytes } = e.events.find((v) => v.id === 'built').facts
const mib = (v) => (v / 1048576).toFixed(1).replace('.', ',')
const rows = [{ label: 'Stage build', value: buildBytes, color: '#a78bfa', y: 80 },
  { label: 'Runtime', value: runtimeBytes, color: '#38bdf8', y: 172 }]
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 330" role="img" aria-labelledby="title desc"><title id="title">Tamaños locales de las images</title><desc id="desc">docker image inspect: build ${buildBytes} bytes; runtime ${runtimeBytes} bytes. No es descarga comprimida ni memoria del proceso.</desc><rect width="380" height="330" rx="12" fill="#0f172a"/><g font-family="system-ui,sans-serif" fill="#f8fafc"><text x="20" y="32" font-size="18" font-weight="700">Build y runtime, escala común</text>${rows.map((r) => `<text x="20" y="${r.y}" font-size="16">${r.label}: ${mib(r.value)} MiB</text><rect x="20" y="${r.y + 14}" width="${(340 * r.value / buildBytes).toFixed(2)}" height="36" rx="4" fill="${r.color}"/>`).join('')}<text x="20" y="274" font-size="14">Tamaño informado por image inspect.</text><text x="20" y="298" font-size="14">No representa RAM o descarga de red.</text></g></svg>`
await writeFile('image-sizes.svg', svg + '\n')
console.log('Gráfico derivado de evidence/compose.json')
