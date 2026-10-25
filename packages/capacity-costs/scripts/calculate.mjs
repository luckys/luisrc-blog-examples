import {
  estimate,
  simulate,
  commitment,
  allocate,
  bottleneck,
  meanInFlight,
} from "../src/model.ts";
export function calculate(input) {
  const { shape, rates, pricing } = input;
  const cases = input.profiles.map((profile) => {
    const result = estimate(profile.segments, shape, rates, pricing);
    return {
      id: profile.id,
      result,
      cpuDouble: estimate(
        profile.segments,
        { ...shape, cpuMs: shape.cpuMs * 2 },
        rates,
        pricing,
      ),
      payloadTenfold: estimate(profile.segments, shape, rates, {
        ...pricing,
        bytesPerRequest: pricing.bytesPerRequest * 10,
      }),
      commitments: [2, 6].map((units) => ({
        units,
        ...commitment(
          profile.segments,
          shape,
          pricing.days,
          units,
          rates.replicaHour,
          "42000",
        ),
      })),
      allocation: {
        weights: [5, 3, 2],
        teams: ["catalogue", "search", "platform"],
        shares: allocate(result.subtotal, [5, 3, 2]),
      },
    };
  });
  return {
    cases,
    little: [200, 800].map((meanMs) => ({
      rps: 100,
      meanMs,
      inFlight: meanInFlight(100, meanMs),
    })),
    bottlenecks: [5, 20].map((dbMs) => ({
      dbMs,
      ...bottleneck(6, { ...shape, dbSlots: 4, dbMs, visits: 1 }),
    })),
    traces: {
      reactive: simulate({ ...shape, ...input.policy }),
      prewarmed: simulate({ ...shape, ...input.policy, min: 6 }),
      slowDatabase: simulate({ ...shape, ...input.policy, dbRps: 200 }),
    },
  };
}
