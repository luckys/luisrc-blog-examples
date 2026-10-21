import { Money, Payment } from "./domain.ts";
import { InMemoryPayments, requestRefund } from "./application.ts";

const repository = new InMemoryPayments(
  Payment.capture("p1", new Money(10000, "EUR")),
);
const outcomes = await Promise.allSettled([
  requestRefund(repository, "p1", "r1", new Money(7000, "EUR")),
  requestRefund(repository, "p1", "r2", new Money(4000, "EUR")),
]);
console.log(
  JSON.stringify(
    {
      outcomes: outcomes.map((result) =>
        result.status === "fulfilled" ? "accepted" : result.reason.message,
      ),
      reservedMinor: (await repository.load("p1")).payment.reservedMinor,
      events: repository.events,
    },
    null,
    2,
  ),
);
