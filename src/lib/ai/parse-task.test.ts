import { describe, expect, it } from "vitest";
import { parseTaskText } from "./parse-task";

const now = new Date("2026-11-04T02:30:00.000Z");
const zone = "Asia/Kolkata";
const members = [
  { name: "Rahul Verma" },
  { name: "Priya Nair" },
  { name: "Ananya Das" },
];

describe("parseTaskText", () => {
  it("reads a Hinglish assignment with a person, time, and priority", () => {
    const draft = parseTaskText(
      "Rahul ko kal shaam 5 baje tak client report bhejne ka task do, high priority",
      now,
      zone,
      members,
    );
    expect(draft.assigneeNames).toContain("Rahul Verma");
    expect(draft.priority).toBe(1);
    expect(draft.dueAt).toBe("2026-11-05T11:30:00.000Z");
    expect(draft.title.toLowerCase()).toContain("client report");
  });

  it("reads an English reminder that repeats every Monday", () => {
    const draft = parseTaskText("Remind me every Monday to review invoices", now, zone, members);
    expect(draft.reminder).toBe(true);
    expect(draft.assigneeSelf).toBe(true);
    expect(draft.recurrence?.frequency).toBe("WEEKLY");
    expect(draft.recurrence?.byWeekday).toEqual([1]);
    expect(draft.title.toLowerCase()).toContain("review invoices");
    expect(draft.dueAt).toBe("2026-11-09T04:00:00.000Z");
  });

  it("reads every 2nd Monday as the second Monday of the month", () => {
    const draft = parseTaskText("every 2nd Monday standup notes", now, zone, members);
    expect(draft.recurrence?.frequency).toBe("MONTHLY");
    expect(draft.recurrence?.ordinal).toBe(2);
    expect(draft.recurrence?.byWeekday).toEqual([1]);
    expect(draft.title.toLowerCase()).toContain("standup notes");
    expect(draft.dueAt).toBe("2026-11-09T04:00:00.000Z");
  });

  it("reads Hindi for today, evening, and a named teammate", () => {
    const draft = parseTaskText("Priya ko aaj shaam tak budget finalize karo", now, zone, members);
    expect(draft.assigneeNames).toContain("Priya Nair");
    expect(draft.dueAt).toBe("2026-11-04T11:30:00.000Z");
    expect(draft.title.toLowerCase()).toContain("budget finalize");
  });

  it("keeps an English sentence with a label and P2", () => {
    const draft = parseTaskText("Send the proposal to Priya by Friday 3pm, P2, label:design", now, zone, members);
    expect(draft.assigneeNames).toContain("Priya Nair");
    expect(draft.priority).toBe(2);
    expect(draft.labels).toContain("design");
    expect(draft.dueAt).toBe("2026-11-06T09:30:00.000Z");
    expect(draft.title.toLowerCase()).toContain("proposal");
  });
});
