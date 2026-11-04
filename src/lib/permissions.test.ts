import { describe, expect, it } from "vitest";
import { can, canGrantRole } from "./permissions";

describe("permissions", () => {
  it("lets a super admin do everything a manager cannot quite do", () => {
    expect(can("SUPER_ADMIN", "org.billing")).toBe(true);
    expect(can("SUPER_ADMIN", "member.promoteSuper")).toBe(true);
    expect(can("ADMIN", "org.billing")).toBe(false);
    expect(can("ADMIN", "member.promoteSuper")).toBe(false);
    expect(can("ADMIN", "reports.view")).toBe(true);
    expect(can("ADMIN", "pay.manage")).toBe(true);
    expect(can("ADMIN", "task.assignOthers")).toBe(true);
  });

  it("keeps employees on their own work", () => {
    expect(can("EMPLOYEE", "task.assignOthers")).toBe(false);
    expect(can("EMPLOYEE", "task.readAll")).toBe(false);
    expect(can("EMPLOYEE", "member.invite")).toBe(false);
    expect(can("EMPLOYEE", "audit.view")).toBe(false);
    expect(can("EMPLOYEE", "pay.manage")).toBe(false);
  });

  it("stops an admin from granting admin", () => {
    expect(canGrantRole("ADMIN", "EMPLOYEE")).toBe(true);
    expect(canGrantRole("ADMIN", "ADMIN")).toBe(false);
    expect(canGrantRole("SUPER_ADMIN", "ADMIN")).toBe(true);
    expect(canGrantRole("EMPLOYEE", "EMPLOYEE")).toBe(false);
  });
});
