export type Role = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";

export type Action =
  | "task.assignOthers"
  | "task.readAll"
  | "task.deleteAny"
  | "project.manage"
  | "member.invite"
  | "member.manage"
  | "member.promoteAdmin"
  | "member.promoteSuper"
  | "org.settings"
  | "org.billing"
  | "reports.view"
  | "audit.view"
  | "pay.manage"
  | "ai.smartAssign";

const ALL: Action[] = [
  "task.assignOthers",
  "task.readAll",
  "task.deleteAny",
  "project.manage",
  "member.invite",
  "member.manage",
  "member.promoteAdmin",
  "member.promoteSuper",
  "org.settings",
  "org.billing",
  "reports.view",
  "audit.view",
  "pay.manage",
  "ai.smartAssign",
];

const ADMIN: Action[] = ALL.filter((action) => action !== "member.promoteSuper" && action !== "org.billing");

const MATRIX: Record<Role, Set<Action>> = {
  SUPER_ADMIN: new Set(ALL),
  ADMIN: new Set(ADMIN),
  EMPLOYEE: new Set(),
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role]?.has(action) ?? false;
}

export function isManager(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/** A manager may only grant roles at or below their own ceiling. */
export function canGrantRole(actor: Role, next: Role): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor === "ADMIN") return next === "EMPLOYEE";
  return false;
}
