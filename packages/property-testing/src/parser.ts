import { amountMinor } from './money.ts'
export type ParsedPayment = { id: string; amountMinor: number }

export function parsePayment(bytes: Uint8Array): ParsedPayment | null {
  if (bytes.byteLength > 256) return null
  let input: unknown
  try {
    input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return null
    throw error
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const value = input as Record<string, unknown>
  if (typeof value.id !== 'string' || !/^payment-[0-9]{1,3}$/.test(value.id)) return null
  try { return { id: value.id, amountMinor: amountMinor(value.amountMinor) } }
  catch (error) {
    if (error instanceof RangeError) return null
    throw error
  }
}
