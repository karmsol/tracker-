import { calendarDayNumber, getZonedParts, zonedTimeToUtc } from "./zoned";

export type RecurrenceDraft = {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  interval: number;
  byWeekday: number[];
  ordinal: number | null;
  customText: string | null;
};

export function nextOccurrence(
  rule: RecurrenceDraft,
  from: Date,
  timeZone: string,
  hour = 9,
  minute = 30,
): Date {
  const start = getZonedParts(from, timeZone);
  for (let i = 0; i <= 400; i++) {
    const day = new Date(Date.UTC(start.year, start.month - 1, start.day + i));
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + 1;
    const date = day.getUTCDate();
    const instant = zonedTimeToUtc(year, month, date, hour, minute, timeZone);
    if (instant.getTime() <= from.getTime()) continue;
    if (matchesDay(rule, year, month, date, timeZone, from)) return instant;
  }
  return zonedTimeToUtc(start.year, start.month, start.day + 1, hour, minute, timeZone);
}

function matchesDay(
  rule: RecurrenceDraft,
  year: number,
  month: number,
  day: number,
  timeZone: string,
  anchor: Date,
): boolean {
  const noon = zonedTimeToUtc(year, month, day, 12, 0, timeZone);
  const parts = getZonedParts(noon, timeZone);
  const anchorParts = getZonedParts(anchor, timeZone);
  const diff = calendarDayNumber(year, month, day) - calendarDayNumber(anchorParts.year, anchorParts.month, anchorParts.day);
  const interval = Math.max(1, rule.interval || 1);

  if (rule.frequency === "DAILY") return diff % interval === 0;
  if (rule.frequency === "WEEKLY") {
    const days = rule.byWeekday.length ? rule.byWeekday : [anchorParts.weekday];
    if (!days.includes(parts.weekday)) return false;
    return Math.floor(diff / 7) % interval === 0;
  }
  if (rule.frequency === "MONTHLY") {
    const weekday = rule.byWeekday[0] ?? anchorParts.weekday;
    if (parts.weekday !== weekday) return false;
    if (rule.ordinal && nthWeekdayOfMonth(day) !== rule.ordinal) return false;
    const monthDiff = (year - anchorParts.year) * 12 + (month - anchorParts.month);
    return monthDiff % interval === 0;
  }
  return false;
}

function nthWeekdayOfMonth(day: number): number {
  return Math.floor((day - 1) / 7) + 1;
}

export function describeRecurrence(rule: RecurrenceDraft): string {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (rule.customText && rule.frequency === "CUSTOM") return rule.customText;
  if (rule.frequency === "DAILY") return rule.interval === 1 ? "Every day" : `Every ${rule.interval} days`;
  if (rule.frequency === "WEEKLY") {
    const days = rule.byWeekday.map((d) => names[d]).join(", ") || "week";
    return rule.interval === 1 ? `Every ${days}` : `Every ${rule.interval} weeks on ${days}`;
  }
  if (rule.frequency === "MONTHLY" && rule.ordinal && rule.byWeekday.length) {
    const ord = ["", "1st", "2nd", "3rd", "4th", "5th"][rule.ordinal] ?? `${rule.ordinal}th`;
    return `Every ${ord} ${names[rule.byWeekday[0]]}`;
  }
  return rule.customText || "Repeats";
}
