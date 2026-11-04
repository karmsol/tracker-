import { describe, expect, it } from "vitest";
import { describeRecurrence, nextOccurrence } from "./recurrence";

describe("recurrence", () => {
  const from = new Date("2026-11-04T02:30:00.000Z");

  it("lands on the second Monday of the month", () => {
    const next = nextOccurrence(
      { frequency: "MONTHLY", interval: 1, byWeekday: [1], ordinal: 2, customText: null },
      from,
      "Asia/Kolkata",
      9,
      30,
    );
    expect(next.toISOString()).toBe("2026-11-09T04:00:00.000Z");
    expect(describeRecurrence({ frequency: "MONTHLY", interval: 1, byWeekday: [1], ordinal: 2, customText: null })).toBe(
      "Every 2nd Monday",
    );
  });

  it("steps a weekly Monday", () => {
    const next = nextOccurrence(
      { frequency: "WEEKLY", interval: 1, byWeekday: [1], ordinal: null, customText: null },
      from,
      "Asia/Kolkata",
      9,
      30,
    );
    expect(next.toISOString()).toBe("2026-11-09T04:00:00.000Z");
  });
});
