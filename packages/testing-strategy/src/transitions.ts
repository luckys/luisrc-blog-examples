export type State = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type Command = 'start' | 'succeed' | 'fail' | 'cancel'

const rules: Record<State, Partial<Record<Command, State>>> = {
  queued: { start: 'running', cancel: 'cancelled' },
  running: { succeed: 'succeeded', fail: 'failed' },
  succeeded: { succeed: 'succeeded' },
  failed: { fail: 'failed' },
  cancelled: { cancel: 'cancelled' },
}

export function isState(value: unknown): value is State {
  return typeof value === 'string' && Object.hasOwn(rules, value)
}

export function transition(state: State, command: Command): State {
  if (!isState(state)) throw new Error('invalid_transition')
  const row = rules[state]
  if (!Object.hasOwn(row, command)) throw new Error('invalid_transition')
  return row[command]!
}
