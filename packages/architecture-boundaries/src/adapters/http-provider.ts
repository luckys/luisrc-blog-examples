import { parseRate, parseShipment } from "../modules/shipping/public.ts";
import type { RateProvider } from "../modules/shipping/public.ts";

async function boundedJson(response: Response): Promise<unknown> {
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      response.headers.get("content-type") ?? "",
    )
  ) {
    await response.body?.cancel();
    throw new Error("invalid content type");
  }
  if (!response.body) throw new Error("empty body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 2048) throw new Error("response too large");
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    await reader.cancel();
  }
}

export function httpRateProvider(
  origin: string,
  timeoutMs = 500,
): RateProvider {
  const url = new URL(origin);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("loopback origin required");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000)
    throw new Error("invalid timeout");
  const endpoint = new URL("/rate", url);
  return {
    quote: async (input) => {
      const shipment = parseShipment(input);
      const response = await fetch(endpoint, {
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grams: shipment.weightGrams,
          area: shipment.zone,
        }),
      });
      if (response.status !== 200) {
        await response.body?.cancel();
        throw new Error(`provider status ${response.status}`);
      }
      const data = await boundedJson(response);
      if (typeof data !== "object" || data === null || Array.isArray(data))
        throw new Error("invalid provider body");
      const body = data as Record<string, unknown>;
      return parseRate({
        amountMinor: body.price_minor,
        currency: body.currency_code,
        providerReference: body.quote_ref,
      });
    },
  };
}
