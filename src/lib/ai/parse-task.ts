import { nextOccurrence, type RecurrenceDraft } from "../recurrence";
import { getZonedParts, zonedTimeToUtc } from "../zoned";

export type TaskDraft = {
  title: string;
  assigneeNames: string[];
  assigneeSelf: boolean;
  dueAt: string | null;
  priority: 1 | 2 | 3 | 4;
  projectName: string | null;
  labels: string[];
  recurrence: RecurrenceDraft | null;
  reminder: boolean;
  confidence: number;
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  ravivar: 0,
  ravivaar: 0,
  monday: 1,
  mon: 1,
  somvar: 1,
  somvaar: 1,
  tuesday: 2,
  tue: 2,
  mangalvar: 2,
  mangalvaar: 2,
  wednesday: 3,
  wed: 3,
  budhvar: 3,
  budhvaar: 3,
  thursday: 4,
  thu: 4,
  guruvar: 4,
  guruvaar: 4,
  friday: 5,
  fri: 5,
  shukravar: 5,
  shukravaar: 5,
  saturday: 6,
  sat: 6,
  shanivar: 6,
  shanivaar: 6,
};

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  "1st": 1,
  "2nd": 2,
  "3rd": 3,
  "4th": 4,
  "5th": 5,
};

function escapeReg(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Turns an English, Hindi, or Hinglish sentence into a task draft.
 * The model is optional. This parser is the source of truth for the
 * examples the product promises, and the fallback when Claude is down.
 */
export function parseTaskText(
  input: string,
  now: Date,
  timeZone: string,
  members: { name: string }[] = [],
): TaskDraft {
  let work = input.replace(/\s+/g, " ").trim();
  const labels: string[] = [];
  const assigneeNames: string[] = [];
  let assigneeSelf = false;
  let reminder = false;
  let priority: 1 | 2 | 3 | 4 = 4;
  let projectName: string | null = null;
  let recurrence: RecurrenceDraft | null = null;

  const cut = (re: RegExp) => {
    const match = work.match(re);
    if (!match || match.index == null) return null;
    work = `${work.slice(0, match.index)} ${work.slice(match.index + match[0].length)}`.replace(/\s+/g, " ").trim();
    return match;
  };

  work = work.replace(/#([\p{L}0-9_-]{2,30})/gu, (_all, name: string) => {
    labels.push(name.toLowerCase());
    return " ";
  });
  work = work.replace(/\blabels?:\s*([\p{L}0-9_-]+)/giu, (_all, name: string) => {
    labels.push(name.toLowerCase());
    return " ";
  });
  work = work.replace(/\s+/g, " ").trim();

  if (cut(/\b(p1|priority\s*1|high priority|urgent|asap|bahut zaroori|bahut zaruri)\b/i)) priority = 1;
  else if (cut(/\b(p2|priority\s*2|medium priority|medium|madhyam)\b/i)) priority = 2;
  else if (cut(/\b(p3|priority\s*3|low priority|low priority|kam zaroori)\b/i)) priority = 3;
  else if (cut(/\b(p4|priority\s*4)\b/i)) priority = 4;
  else if (cut(/\bhigh\b/i)) priority = 1;
  else if (cut(/\blow\b/i)) priority = 3;

  if (/\b(remind me|reminder|yaad dilana|yaad dilao|mujhe yaad)\b/i.test(input)) reminder = true;
  cut(/\b(remind me to|remind me|yaad dilana|yaad dilao)\b/i);

  const ordinal = cut(
    /\bevery\s+(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|somvar|somvaar|mangalvar|budhvar|guruvar|shukravar|shanivar|ravivar)\b/i,
  );
  if (ordinal) {
    recurrence = {
      frequency: "MONTHLY",
      interval: 1,
      byWeekday: [WEEKDAYS[ordinal[2].toLowerCase()]],
      ordinal: ORDINALS[ordinal[1].toLowerCase()] ?? 1,
      customText: ordinal[0],
    };
  }

  if (!recurrence) {
    const weekly = cut(
      /\b(?:every|har)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|somvar|somvaar|mangalvar|mangalvaar|budhvar|budhvaar|guruvar|guruvaar|shukravar|shukravaar|shanivar|shanivaar|ravivar|ravivaar)\b/i,
    );
    if (weekly) {
      recurrence = {
        frequency: "WEEKLY",
        interval: 1,
        byWeekday: [WEEKDAYS[weekly[1].toLowerCase()]],
        ordinal: null,
        customText: weekly[0],
      };
    }
  }

  if (!recurrence) {
    const everyWeeks = cut(/\bevery\s+(\d+)\s+weeks?\b/i);
    if (everyWeeks) {
      recurrence = {
        frequency: "WEEKLY",
        interval: Number(everyWeeks[1]),
        byWeekday: [1],
        ordinal: null,
        customText: everyWeeks[0],
      };
    }
  }

  if (!recurrence && cut(/\b(every day|everyday|daily|roz|har din)\b/i)) {
    recurrence = { frequency: "DAILY", interval: 1, byWeekday: [], ordinal: null, customText: "daily" };
  }
  if (!recurrence && cut(/\b(every week|weekly|har hafte)\b/i)) {
    recurrence = {
      frequency: "WEEKLY",
      interval: 1,
      byWeekday: [getZonedParts(now, timeZone).weekday],
      ordinal: null,
      customText: "weekly",
    };
  }

  const project = cut(/\b(?:in project|project)\s+([\p{L}0-9][\p{L}0-9 &'-]{1,40})/iu);
  if (project) projectName = project[1].trim();

  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const used = new Set<string>();
  for (const member of sorted) {
    const name = member.name.trim();
    if (used.has(name.toLowerCase())) continue;
    const first = name.split(/\s+/)[0];
    const full =
      cut(new RegExp(`\\b${escapeReg(name)}\\s+ko\\b`, "i")) ||
      cut(new RegExp(`\\b(?:assign(?:ed)?\\s+to|for|to)\\s+${escapeReg(name)}\\b`, "i"));
    const firstHit =
      !full && first.length > 2
        ? cut(new RegExp(`\\b${escapeReg(first)}\\s+ko\\b`, "i")) ||
          cut(new RegExp(`\\b(?:assign(?:ed)?\\s+to|for|to)\\s+${escapeReg(first)}\\b`, "i"))
        : null;
    if (full || firstHit) {
      assigneeNames.push(name);
      used.add(name.toLowerCase());
    }
  }

  if (/\b(remind me|mujhe|myself)\b/i.test(input)) assigneeSelf = true;
  cut(/\b(mujhe|myself)\b/i);

  let hour: number | null = null;
  let minute = 0;
  let dayPart: "morning" | "afternoon" | "evening" | "night" | null = null;
  const clock = cut(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)\b/i);
  if (clock) {
    hour = Number(clock[1]);
    minute = clock[2] ? Number(clock[2]) : 0;
    const marker = (clock[3] || "").toLowerCase();
    if (marker === "pm" && hour < 12) hour += 12;
    if (marker === "am" && hour === 12) hour = 0;
    if (marker === "baje" && hour <= 7) hour += 12;
  }
  if (cut(/\b(subah|morning)\b/i)) dayPart = "morning";
  else if (cut(/\b(dopahar|afternoon)\b/i)) dayPart = "afternoon";
  else if (cut(/\b(shaam|sham|evening)\b/i)) dayPart = "evening";
  else if (cut(/\b(raat|night)\b/i)) dayPart = "night";

  if (hour != null && hour <= 12 && dayPart) {
    if ((dayPart === "evening" || dayPart === "night" || dayPart === "afternoon") && hour < 12) hour += 12;
    if (dayPart === "morning" && hour === 12) hour = 0;
    if (dayPart === "morning" && hour > 12) hour -= 12;
  }
  if (hour == null && dayPart) {
    hour = dayPart === "morning" ? 9 : dayPart === "afternoon" ? 13 : dayPart === "evening" ? 17 : 21;
  }

  let dayOffset: number | null = null;
  let weekday: number | null = null;
  if (cut(/\b(aaj|today)\b/i)) dayOffset = 0;
  else if (cut(/\b(parso|parson|day after tomorrow)\b/i)) dayOffset = 2;
  else if (cut(/\b(kal|tomorrow)\b/i)) dayOffset = 1;

  if (!recurrence) {
    const named = cut(
      /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|somvar|somvaar|mangalvar|budhvar|guruvar|shukravar|shanivar|ravivar)\b/i,
    );
    if (named && dayOffset == null) weekday = WEEKDAYS[named[2].toLowerCase()];
  }
  if (dayOffset == null && weekday == null && cut(/\b(next week|agle hafte|agale hafte)\b/i)) dayOffset = 7;

  let due: Date | null = null;
  if (dayOffset != null || weekday != null || (hour != null && !recurrence)) {
    const parts = getZonedParts(now, timeZone);
    const noon = zonedTimeToUtc(parts.year, parts.month, parts.day, 12, 0, timeZone);
    let target = noon;
    if (dayOffset != null) {
      const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset));
      target = zonedTimeToUtc(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), 12, 0, timeZone);
    }
    if (weekday != null) {
      let delta = (weekday - parts.weekday + 7) % 7;
      if (delta === 0) delta = 7;
      const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + delta));
      target = zonedTimeToUtc(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), 12, 0, timeZone);
    }
    const tp = getZonedParts(target, timeZone);
    due = zonedTimeToUtc(tp.year, tp.month, tp.day, hour ?? 18, minute, timeZone);
  }

  if (recurrence && !due) {
    const parts = getZonedParts(now, timeZone);
    due = nextOccurrence(recurrence, now, timeZone, hour ?? 9, hour == null ? 30 : minute);
    void parts;
  }

  work = work
    .replace(/\bbhejne\s+ka\b/gi, " ")
    .replace(/\b(ka|ki|ke)\s+task\b/gi, " ")
    .replace(/\btask\s+(do|banao|de do|dedo|create)\b/gi, " ")
    .replace(/\b(please|pls|kindly|bhejdo|bhej do|bhejna|bhejne)\b/gi, " ")
    .replace(/\b(tak|ko|karo|karna|kar do|by)\b/gi, " ")
    .replace(/^(to|that)\s+/i, "")
    .replace(/[.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const titleCore = work.replace(/^(to|a|the)\s+/i, "").trim();
  const title = titleCore
    ? titleCore.charAt(0).toUpperCase() + titleCore.slice(1)
    : recurrence
      ? "Recurring task"
      : "Untitled task";

  let confidence = 0.45;
  if (due) confidence += 0.15;
  if (assigneeNames.length || assigneeSelf) confidence += 0.15;
  if (priority !== 4) confidence += 0.1;
  if (recurrence) confidence += 0.1;
  if (title !== "Untitled task") confidence += 0.05;

  return {
    title,
    assigneeNames,
    assigneeSelf,
    dueAt: due ? due.toISOString() : null,
    priority,
    projectName,
    labels: [...new Set(labels)],
    recurrence,
    reminder,
    confidence: Math.min(0.95, confidence),
  };
}
