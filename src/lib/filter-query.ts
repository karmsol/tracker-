export type FilterNode =
  | { type: "and" | "or"; items: FilterNode[] }
  | { type: "cond"; field: string; value: string };

export type FilterTask = {
  title: string;
  description?: string | null;
  priority: number;
  status: string;
  dueAt?: string | null;
  assigneeIds: string[];
  labelNames: string[];
  projectName?: string | null;
};

export type FilterContext = {
  meId: string;
  now: Date;
  timeZone: string;
  memberIdsByName: Record<string, string>;
};

const FIELDS = new Set(["priority", "assignee", "due", "status", "label", "project", "text"]);

export function parseFilter(input: string): FilterNode {
  const tokens = tokenize(input);
  let index = 0;

  function parseOr(): FilterNode {
    const items = [parseAnd()];
    while (tokens[index]?.toUpperCase() === "OR") {
      index += 1;
      items.push(parseAnd());
    }
    return items.length === 1 ? items[0] : { type: "or", items };
  }

  function parseAnd(): FilterNode {
    const items = [parsePrimary()];
    while (tokens[index] && tokens[index].toUpperCase() === "AND") {
      index += 1;
      items.push(parsePrimary());
    }
    return items.length === 1 ? items[0] : { type: "and", items };
  }

  function parsePrimary(): FilterNode {
    const token = tokens[index];
    if (!token) return { type: "cond", field: "text", value: "" };
    if (token === "(") {
      index += 1;
      const node = parseOr();
      if (tokens[index] === ")") index += 1;
      return node;
    }
    index += 1;
    const split = token.indexOf(":");
    if (split > 0) {
      const field = token.slice(0, split).toLowerCase();
      let value = token.slice(split + 1).replace(/^"|"$/g, "");
      if (field === "due" && value === "this" && tokens[index]?.toLowerCase() === "week") {
        index += 1;
        value = "this week";
      }
      if (FIELDS.has(field)) return { type: "cond", field, value };
    }
    return { type: "cond", field: "text", value: token.replace(/^"|"$/g, "") };
  }

  return parseOr();
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"[^"]*"|\(|\)|[^\s()]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input))) tokens.push(match[0]);
  return tokens;
}

export function taskMatches(task: FilterTask, node: FilterNode, ctx: FilterContext): boolean {
  if (node.type === "and") return node.items.every((item) => taskMatches(task, item, ctx));
  if (node.type === "or") return node.items.some((item) => taskMatches(task, item, ctx));
  if (node.type !== "cond") return false;
  const value = node.value.toLowerCase();
  if (!value && node.field === "text") return true;
  if (node.field === "text") {
    return `${task.title} ${task.description ?? ""}`.toLowerCase().includes(value);
  }
  if (node.field === "priority") {
    const rank = value.replace(/^p/, "");
    return String(task.priority) === rank;
  }
  if (node.field === "status") {
    const normalized = value.replace(/\s+/g, "_");
    if (normalized === "open") return task.status !== "DONE";
    return task.status.toLowerCase() === normalized;
  }
  if (node.field === "assignee") {
    if (value === "me") return task.assigneeIds.includes(ctx.meId);
    const id = ctx.memberIdsByName[value];
    if (id) return task.assigneeIds.includes(id);
    return false;
  }
  if (node.field === "label") return task.labelNames.some((name) => name.toLowerCase() === value);
  if (node.field === "project") return (task.projectName ?? "").toLowerCase().includes(value);
  if (node.field === "due") return dueMatches(task.dueAt, value, ctx);
  return false;
}

function dueMatches(dueAt: string | null | undefined, value: string, ctx: FilterContext): boolean {
  if (value === "none") return !dueAt;
  if (!dueAt) return false;
  const due = new Date(dueAt).getTime();
  const now = ctx.now.getTime();
  if (value === "overdue") return due < now;
  if (value === "today") return sameZonedDay(due, now, ctx.timeZone);
  if (value === "tomorrow") {
    const tomorrow = now + 86_400_000;
    return sameZonedDay(due, tomorrow, ctx.timeZone);
  }
  if (value === "this week" || value === "week") {
    return due >= now - 86_400_000 && due <= now + 7 * 86_400_000;
  }
  return false;
}

function sameZonedDay(a: number, b: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(new Date(a)) === fmt.format(new Date(b));
}
