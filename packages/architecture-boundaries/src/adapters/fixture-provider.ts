import type { RateProvider } from "../modules/shipping/public.ts";

export function fixtureProvider(): RateProvider {
  return {
    quote: async (shipment) =>
      Object.freeze({
        amountMinor: shipment.zone === "local" ? 500 : 900,
        currency: "EUR",
        providerReference: `fixture-${shipment.zone}`,
      }),
  };
}
