import { integer, label } from './validation.ts'

export type Register = Readonly<{ version: number; value: string }>

// A register replaces its whole value. It is not a stream of required transitions.
export function replicaPair() {
  let primary: Register = Object.freeze({ version: 0, value: 'pending' })
  let follower: Register = primary
  const messages: Register[] = []
  return {
    write(value: unknown): Register {
      label(value)
      integer(primary.version + 1)
      primary = Object.freeze({ version: primary.version + 1, value })
      messages.push(primary)
      return primary
    },
    readPrimary: () => primary,
    readFollower(minVersion: number = 0): Register {
      integer(minVersion)
      if (follower.version < minVersion) throw new Error('not_caught_up')
      return follower
    },
    deliver(index: number): void {
      integer(index, 0, messages.length - 1)
      const message = messages.splice(index, 1)[0]!
      if (message.version > follower.version) follower = message
    },
    pending: () => messages.length,
  }
}
