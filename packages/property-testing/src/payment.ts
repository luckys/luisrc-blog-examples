export type Event = 'submit' | 'confirm' | 'decline'
export type State = 'created' | 'processing' | 'succeeded' | 'failed'
export type Variant = 'fixed' | 'late-decline' | 'duplicate-capture'

// Fault variants belong to the exercise, never selectable by a public endpoint.
export class Payment {
  state: State = 'created'
  captures = 0
  readonly variant: Variant
  constructor(variant: Variant = 'fixed') { this.variant = variant }

  apply(event: Event): void {
    if (this.variant === 'late-decline' && event === 'decline' && this.state === 'succeeded') {
      this.state = 'failed'
      return
    }
    if (this.variant === 'duplicate-capture' && event === 'confirm' && this.state === 'succeeded') {
      this.captures++
      return
    }
    if (this.state === 'created' && event === 'submit') this.state = 'processing'
    else if (this.state === 'processing' && event === 'confirm') {
      this.state = 'succeeded'
      this.captures++
    } else if (this.state === 'processing' && event === 'decline') this.state = 'failed'
  }
}
