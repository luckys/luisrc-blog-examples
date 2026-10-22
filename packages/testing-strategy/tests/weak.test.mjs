import test from 'node:test'
import { transition } from '../src/transitions.ts'

// Contraejemplo pedagógico. No usar como suite de regresión.
test('débil: recorre combinaciones pero ignora tanto respuestas como errores', () => {
  for (const state of ['queued', 'running', 'succeeded', 'failed', 'cancelled', 'unknown'])
    for (const command of ['start', 'succeed', 'fail', 'cancel']) {
      try { transition(state, command) } catch {}
    }
})
