import { WindowIndex } from './windows.ts'
import { scenarios, expand, PERIOD_MINUTES } from './simulation.ts'
import { summarizeBudget, thresholdFor, projectedHoursToExhaustion } from './budget.ts'
import { classifyHttp } from './sli.ts'
import { classifyCohorts } from './cohorts.ts'
import { httpEvents, operations } from './fixtures.ts'
import { evaluateAlerts, rules } from './alerts.ts'
export function buildReport() {
  return {
    http: classifyHttp(httpEvents, 300),
    cohorts: [5, 10, 14].map((now) => ({ now, ...classifyCohorts(operations, now, 5) })),
    examples: { budget: summarizeBudget(1000000, 1200, 999000),
      thresholds: [thresholdFor(0.02, 720, 1), thresholdFor(0.02, 672, 1)],
      exhaustionHours: projectedHoursToExhaustion(800, 10000, 0.01) },
    scenarios: scenarios.map((scenario) => {
      const index = new WindowIndex(expand(scenario))
      const window = index.read(0, PERIOD_MINUTES)
      const timeline = Array.from({ length: 361 }, (_, i) => {
        const now = PERIOD_MINUTES - 360 + i
        return { now, ...evaluateAlerts(index, now, 999000) }
      })
      return { id: scenario.id, window, budget: window.complete ? summarizeBudget(window.total, window.bad, 999000) : null,
        alerts: evaluateAlerts(index, PERIOD_MINUTES, 999000), timeline }
    }), rules,
  }
}
