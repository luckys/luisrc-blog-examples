export type Note = { id: string; text: string }

export function parseNote(value: unknown): Note {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid_note')
  const input = value as Record<string, unknown>
  if (Object.keys(input).sort().join(',') !== 'id,text' || typeof input.id !== 'string'
    || !/^[a-z0-9-]{1,40}$/.test(input.id) || typeof input.text !== 'string'
    || input.text.trim().length === 0 || input.text.length > 200) throw Error('invalid_note')
  return { id: input.id, text: input.text }
}

type Dependencies = {
  cached: (id: string) => Promise<string | null>
  load: (id: string) => Promise<Note | null>
  cache: (note: Note) => Promise<void>
}

export async function readNote(id: string, deps: Dependencies) {
  try {
    const raw = await deps.cached(id)
    if (raw !== null) {
      const note = parseNote(JSON.parse(raw))
      if (note.id === id) return { note, source: 'redis' as const }
    }
  } catch { /* El dato persistente sigue en PostgreSQL. */ }
  const note = await deps.load(id)
  if (note !== null) {
    try { await deps.cache(note) } catch { /* La cache es prescindible para esta lectura. */ }
  }
  return { note, source: 'postgres' as const }
}
