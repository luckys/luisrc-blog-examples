import type { MinuteBin } from './windows.ts'
export const PERIOD_MINUTES = 43200
type Segment = { minutes: number; total: number; bad: number; present: boolean }
export type Scenario = { id: string; title: string; segments: Segment[] }
const segment = (minutes: number, total = 1000, bad = 0, present = true): Segment => ({ minutes, total, bad, present })
export const scenarios: Scenario[] = [
  { id: 'baseline', title: 'Sin errores', segments: [segment(PERIOD_MINUTES)] },
  { id: 'fast-burn', title: 'Degradación rápida activa', segments: [segment(43190), segment(10, 1000, 150)] },
  { id: 'recovered', title: 'Degradación ya recuperada', segments: [segment(43175), segment(10, 1000, 150), segment(15)] },
  { id: 'slow-burn', title: 'Degradación lenta sostenida', segments: [segment(42840), segment(360, 1000, 10)] },
  { id: 'low-traffic', title: 'Un fallo con tráfico bajo', segments: [segment(43199, 1), segment(1, 1, 1)] },
  { id: 'no-traffic', title: 'Sin tráfico conocido', segments: [segment(PERIOD_MINUTES, 0)] },
  { id: 'missing-data', title: 'Faltan cinco minutos de telemetría', segments: [segment(43195), segment(5, 0, 0, false)] },
]
export function expand(scenario: Scenario): MinuteBin[] {
  const bins: MinuteBin[] = []
  for (const s of scenario.segments) {
    if (!Number.isInteger(s.minutes) || s.minutes <= 0 || bins.length + s.minutes > PERIOD_MINUTES) throw new RangeError('segment duration')
    for (let i = 0; i < s.minutes; i++) bins.push({ minute: bins.length, total: s.total, bad: s.bad, present: s.present })
  }
  if (bins.length !== PERIOD_MINUTES) throw new RangeError('incomplete scenario grid')
  return bins
}
