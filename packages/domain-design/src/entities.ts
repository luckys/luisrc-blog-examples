function validId(value: string): boolean {
  return typeof value === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(value);
}

export class Shipment {
  readonly #id: string;
  readonly #orderId: string;
  readonly #state: "in_transit" | "delivered";

  private constructor(
    id: string,
    orderId: string,
    state: "in_transit" | "delivered",
  ) {
    if (!validId(id) || !validId(orderId))
      throw new Error("invalid shipment id");
    this.#id = id;
    this.#orderId = orderId;
    this.#state = state;
  }

  static start(id: string, orderId: string): Shipment {
    return new Shipment(id, orderId, "in_transit");
  }

  get id(): string {
    return this.#id;
  }
  get orderId(): string {
    return this.#orderId;
  }
  get state(): "in_transit" | "delivered" {
    return this.#state;
  }

  sameIdentityAs(other: Shipment): boolean {
    return this.id === other.id;
  }

  markDelivered(): Shipment {
    if (this.state === "delivered") return this;
    return new Shipment(this.id, this.orderId, "delivered");
  }
}
