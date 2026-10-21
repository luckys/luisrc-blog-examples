import type { Shipment, Rate, DeliveryQuote } from "./domain.ts";

export type RateProvider = { quote: (shipment: Shipment) => Promise<Rate> };
export type QuoteWriter = { record: (quote: DeliveryQuote) => Promise<void> };
export type QuoteReader = {
  find: (id: string) => Promise<DeliveryQuote | null>;
};
