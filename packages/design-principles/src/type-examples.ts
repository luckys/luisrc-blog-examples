import type { QuoteReader, QuoteWriter } from "./application.ts";
import type { RateRule } from "./rates.ts";

// Compila, pero el test de contrato detecta la precondición adicional.
export const lightOnly: RateRule = (shipment) => {
  if (shipment.weightGrams > 1000) throw new Error("too heavy");
  return 500;
};

export const readerOnly: QuoteReader = { find: async () => null };

// @ts-expect-error Una capacidad de lectura no satisface el contrato de escritura.
export const notAWriter: QuoteWriter = readerOnly;
