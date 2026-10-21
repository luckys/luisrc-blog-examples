export type Currency = "EUR" | "USD";

export class Money {
  readonly #minor: number;
  readonly #currency: Currency;

  constructor(minor: number, currency: Currency) {
    if (!Number.isSafeInteger(minor) || minor < 0)
      throw new Error("invalid minor units");
    if (currency !== "EUR" && currency !== "USD")
      throw new Error("unsupported currency");
    this.#minor = minor;
    this.#currency = currency;
  }

  get minor(): number {
    return this.#minor;
  }
  get currency(): Currency {
    return this.#currency;
  }

  equals(other: Money): boolean {
    return this.minor === other.minor && this.currency === other.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error("currency mismatch");
    return new Money(this.minor + other.minor, this.currency);
  }
}

export type RefundRequested = Readonly<{
  type: "RefundRequested";
  paymentId: string;
  refundId: string;
  minor: number;
  currency: Currency;
}>;
export type RefundDecision = Readonly<{
  next: Payment;
  event: RefundRequested;
}>;

function requireId(value: string): void {
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]{1,64}$/.test(value))
    throw new Error("invalid id");
}

export class Payment {
  readonly #id: string;
  readonly #captured: Money;
  readonly #refunds: ReadonlyMap<string, Money>;

  private constructor(
    id: string,
    captured: Money,
    refunds: ReadonlyMap<string, Money>,
  ) {
    requireId(id);
    if (captured.minor === 0) throw new Error("capture must be positive");
    this.#id = id;
    this.#captured = captured;
    this.#refunds = new Map(refunds);
  }

  static capture(id: string, captured: Money): Payment {
    return new Payment(id, captured, new Map());
  }

  get id(): string {
    return this.#id;
  }
  get captured(): Money {
    return this.#captured;
  }
  get reservedMinor(): number {
    return [...this.#refunds.values()].reduce(
      (sum, money) => sum + money.minor,
      0,
    );
  }

  requestRefund(refundId: string, amount: Money): RefundDecision {
    requireId(refundId);
    if (amount.currency !== this.captured.currency)
      throw new Error("currency mismatch");
    if (amount.minor === 0) throw new Error("refund must be positive");
    if (this.#refunds.has(refundId)) throw new Error("duplicate refund id");
    if (amount.minor > this.captured.minor - this.reservedMinor)
      throw new Error("refund limit");
    const refunds = new Map(this.#refunds);
    refunds.set(refundId, amount);
    return Object.freeze({
      next: new Payment(this.id, this.captured, refunds),
      event: Object.freeze({
        type: "RefundRequested",
        paymentId: this.id,
        refundId,
        minor: amount.minor,
        currency: amount.currency,
      }),
    });
  }
}
