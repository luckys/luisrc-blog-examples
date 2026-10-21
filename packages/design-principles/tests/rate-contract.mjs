import assert from "node:assert/strict";

export function assertRateContract(rate) {
  for (const zone of ["local", "remote"])
    for (const weightGrams of [1, 1000, 1001, 20000])
      for (const subtotalMinor of [0, 4999, 5000]) {
        const input = Object.freeze({ zone, weightGrams, subtotalMinor });
        const first = rate(input);
        assert.ok(
          Number.isSafeInteger(first) && first >= 0 && first <= 1_000_000_000,
        );
        assert.equal(rate(input), first);
      }
}
