import {
  Money,
  Payment,
  type RefundDecision,
  type RefundRequested,
} from "./domain.ts";

export type StoredPayment = Readonly<{ payment: Payment; revision: number }>;
export interface Payments {
  load(id: string): Promise<StoredPayment>;
  commit(expectedRevision: number, decision: RefundDecision): Promise<void>;
}

export async function requestRefund(
  repository: Payments,
  paymentId: string,
  refundId: string,
  amount: Money,
): Promise<RefundRequested> {
  const { payment, revision } = await repository.load(paymentId);
  const decision = payment.requestRefund(refundId, amount);
  await repository.commit(revision, decision);
  return decision.event;
}

// Contract fake: synchronous check-and-replace models a single atomic commit.
// It is not SQL, durable storage, a network queue or a distributed outbox.
export class InMemoryPayments implements Payments {
  #stored: StoredPayment;
  #events: RefundRequested[] = [];
  failNextCommit = false;

  constructor(payment: Payment) {
    this.#stored = Object.freeze({ payment, revision: 0 });
  }

  get events(): RefundRequested[] {
    return [...this.#events];
  }

  async load(id: string): Promise<StoredPayment> {
    if (id !== this.#stored.payment.id) throw new Error("payment not found");
    return this.#stored;
  }

  async commit(
    expectedRevision: number,
    decision: RefundDecision,
  ): Promise<void> {
    if (this.failNextCommit) {
      this.failNextCommit = false;
      throw new Error("storage unavailable");
    }
    if (expectedRevision !== this.#stored.revision)
      throw new Error("revision conflict");
    if (
      decision.next.id !== this.#stored.payment.id ||
      decision.event.paymentId !== decision.next.id
    )
      throw new Error("payment identity mismatch");
    this.#stored = Object.freeze({
      payment: decision.next,
      revision: expectedRevision + 1,
    });
    this.#events.push(decision.event);
  }
}
