const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatInr(amount: number) {
  return inr.format(Math.round(amount));
}

export function monthLabel(year: number, month: number, locale = "en-IN") {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export function computePay(input: {
  baseSalary: number;
  hra?: number;
  specialAllowance?: number;
  pfDeduction?: number;
  taxDeduction?: number;
  otherDeduction?: number;
}) {
  const baseSalary = Math.max(0, Math.round(input.baseSalary));
  const hra = Math.max(0, Math.round(input.hra ?? 0));
  const specialAllowance = Math.max(0, Math.round(input.specialAllowance ?? 0));
  const pfDeduction = Math.max(0, Math.round(input.pfDeduction ?? 0));
  const taxDeduction = Math.max(0, Math.round(input.taxDeduction ?? 0));
  const otherDeduction = Math.max(0, Math.round(input.otherDeduction ?? 0));
  const gross = baseSalary + hra + specialAllowance;
  const totalDeductions = pfDeduction + taxDeduction + otherDeduction;
  const netPay = Math.max(0, gross - totalDeductions);
  return { baseSalary, hra, specialAllowance, pfDeduction, taxDeduction, otherDeduction, gross, totalDeductions, netPay };
}
