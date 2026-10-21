import { Money, Payment } from "./domain.ts";
import { InMemoryPayments } from "./application.ts";

export async function buildScenarios() {
  const scenarios = [];
  for (const [id, firstMinor, secondMinor] of [
    ["over-limit", 7000, 4000],
    ["within-limit", 2000, 3000],
  ] as const) {
    const repository = new InMemoryPayments(
      Payment.capture("p1", new Money(10000, "EUR")),
    );
    const a = await repository.load("p1");
    const b = await repository.load("p1");
    const frames = [
      {
        label: "A y B leen revisión 0",
        revision: 0,
        reservedMinor: 0,
        events: 0,
      },
    ];
    const first = a.payment.requestRefund("r1", new Money(firstMinor, "EUR"));
    const second = b.payment.requestRefund("r2", new Money(secondMinor, "EUR"));
    await repository.commit(a.revision, first);
    frames.push({
      label: "A confirma su decisión",
      revision: 1,
      reservedMinor: firstMinor,
      events: 1,
    });
    try {
      await repository.commit(b.revision, second);
      throw new Error("expected conflict was missing");
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "revision conflict")
        throw error;
      frames.push({
        label: "B encuentra revision conflict; no se guarda su evento",
        revision: 1,
        reservedMinor: firstMinor,
        events: 1,
      });
    }
    const latest = await repository.load("p1");
    try {
      const reconsidered = latest.payment.requestRefund(
        "r2",
        new Money(secondMinor, "EUR"),
      );
      await repository.commit(latest.revision, reconsidered);
      frames.push({
        label: "B relee, vuelve a decidir y confirma",
        revision: 2,
        reservedMinor: firstMinor + secondMinor,
        events: 2,
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "refund limit")
        throw error;
      frames.push({
        label: "B relee: la regla de negocio ahora rechaza la solicitud",
        revision: 1,
        reservedMinor: firstMinor,
        events: 1,
      });
    }
    scenarios.push({ id, firstMinor, secondMinor, frames });
  }
  return {
    kind: "in-memory-contract-traces",
    capturedMinor: 10000,
    currency: "EUR",
    scenarios,
  };
}
