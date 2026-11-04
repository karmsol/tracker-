import { describe, expect, it } from "vitest";
import { parseFilter, taskMatches } from "./filter-query";

const ctx = {
  meId: "me",
  now: new Date("2026-11-04T08:00:00.000Z"),
  timeZone: "Asia/Kolkata",
  memberIdsByName: { priya: "priya" },
};

const task = {
  title: "Client report",
  description: "Send the deck",
  priority: 1,
  status: "TODO",
  dueAt: "2026-11-05T12:00:00.000Z",
  assigneeIds: ["me"],
  labelNames: ["client"],
  projectName: "Client Delivery",
};

describe("filter query", () => {
  it("matches a manager-style saved filter", () => {
    const node = parseFilter("priority:P1 AND assignee:me AND due:this week");
    expect(taskMatches(task, node, ctx)).toBe(true);
  });

  it("rejects a task outside the filter", () => {
    const node = parseFilter("priority:P1 AND assignee:priya");
    expect(taskMatches(task, node, ctx)).toBe(false);
  });

  it("supports OR and free text", () => {
    const node = parseFilter("text:deck OR label:missing");
    expect(taskMatches(task, node, ctx)).toBe(true);
  });
});
