import { describe, expect, it } from "vitest";
import { computePay, formatInr, monthLabel } from "./money";

describe("money", () => {
  it("computes net pay from Indian-style components", () => {
    expect(
      computePay({
        baseSalary: 85000,
        hra: 34000,
        specialAllowance: 8000,
        pfDeduction: 10200,
        taxDeduction: 4000,
      }),
    ).toEqual({
      baseSalary: 85000,
      hra: 34000,
      specialAllowance: 8000,
      pfDeduction: 10200,
      taxDeduction: 4000,
      otherDeduction: 0,
      gross: 127000,
      totalDeductions: 14200,
      netPay: 112800,
    });
  });

  it("formats INR without paise noise", () => {
    expect(formatInr(112800)).toContain("1,12,800");
    expect(monthLabel(2026, 11)).toMatch(/November/);
  });
});
