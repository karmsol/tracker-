import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { AppContext } from "@/lib/session";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { createTask, listTasks, updateTask } from "./tasks";

function context(user: { id: string; name: string; email: string }, organizationId: string, role: AppContext["role"]): AppContext {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      locale: "en",
      theme: "system",
      onboardingDone: true,
      image: null,
    },
    role,
    organizationId,
    org: {
      id: organizationId,
      name: "Isolation",
      slug: "isolation",
      timezone: "Asia/Kolkata",
      workingDays: [1, 2, 3, 4, 5],
      workStart: "09:30",
      workEnd: "18:30",
      notifyOnAssign: true,
      emailOnAssign: true,
      digestHour: 8,
      weeklyReportDay: 1,
      logoKey: null,
    },
    ip: "test",
  };
}

describe("organization isolation", () => {
  const stamp = Date.now();
  const ids: { orgs: string[]; users: string[] } = { orgs: [], users: [] };

  afterAll(async () => {
    if (ids.orgs.length) {
      await prisma.emailOutbox.deleteMany({ where: { organizationId: { in: ids.orgs } } });
      await prisma.organization.deleteMany({ where: { id: { in: ids.orgs } } });
    }
    if (ids.users.length) await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
  });

  it("hides another workspace's tasks and blocks cross-assignment", async () => {
    const north = await prisma.organization.create({ data: { name: "North Loom", slug: `north-${stamp}` } });
    const south = await prisma.organization.create({ data: { name: "South Loom", slug: `south-${stamp}` } });
    ids.orgs.push(north.id, south.id);
    const admin = await prisma.user.create({
      data: { name: "North Admin", email: `north-admin-${stamp}@karmkaro.test`, emailVerified: new Date() },
    });
    const employee = await prisma.user.create({
      data: { name: "North Hand", email: `north-hand-${stamp}@karmkaro.test`, emailVerified: new Date() },
    });
    const outsider = await prisma.user.create({
      data: { name: "South Admin", email: `south-admin-${stamp}@karmkaro.test`, emailVerified: new Date() },
    });
    ids.users.push(admin.id, employee.id, outsider.id);
    await prisma.membership.createMany({
      data: [
        { userId: admin.id, organizationId: north.id, role: "ADMIN" },
        { userId: employee.id, organizationId: north.id, role: "EMPLOYEE" },
        { userId: outsider.id, organizationId: south.id, role: "ADMIN" },
      ],
    });

    const northAdmin = context(admin, north.id, "ADMIN");
    const northEmployee = context(employee, north.id, "EMPLOYEE");
    const southAdmin = context(outsider, south.id, "ADMIN");

    const task = await createTask(northAdmin, { title: `Private loom note ${stamp}`, assigneeIds: [admin.id] });
    const visibleToAdmin = await listTasks(northAdmin, { view: "search", q: String(stamp) });
    const visibleToEmployee = await listTasks(northEmployee, { view: "search", q: String(stamp) });
    const visibleToSouth = await listTasks(southAdmin, { view: "search", q: String(stamp) });

    expect(visibleToAdmin.map((item) => item.id)).toContain(task.id);
    expect(visibleToEmployee.map((item) => item.id)).not.toContain(task.id);
    expect(visibleToSouth).toHaveLength(0);
    await expect(updateTask(southAdmin, task.id, { title: "Stolen" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(createTask(northEmployee, { title: "Not allowed", assigneeIds: [admin.id] })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
