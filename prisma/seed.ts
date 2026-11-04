import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { zonedTimeToUtc } from "../src/lib/zoned";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const PASSWORD = "KarmKaro#2026";
const ZONE = "Asia/Kolkata";

function at(dayOffset: number, hour: number, minute = 0) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const bag = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const base = new Date(Date.UTC(Number(bag.year), Number(bag.month) - 1, Number(bag.day) + dayOffset));
  return zonedTimeToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), hour, minute, ZONE);
}

async function main() {
  const existing = await prisma.organization.findUnique({ where: { slug: "indus-collective" } });
  if (existing) {
    console.log("Seed already present");
    return;
  }
  const passwordHash = await hash(PASSWORD, 10);
  const people = [
    ["Aanya Sharma", "aanya.sharma@karmkaro.dev", "SUPER_ADMIN", "Founder"],
    ["Arjun Mehta", "arjun.mehta@karmkaro.dev", "ADMIN", "Studio manager"],
    ["Rahul Verma", "rahul.verma@karmkaro.dev", "EMPLOYEE", "Designer"],
    ["Priya Nair", "priya.nair@karmkaro.dev", "EMPLOYEE", "Producer"],
    ["Ananya Das", "ananya.das@karmkaro.dev", "EMPLOYEE", "Writer"],
    ["Vikram Singh", "vikram.singh@karmkaro.dev", "EMPLOYEE", "Engineer"],
    ["Meera Iyer", "meera.iyer@karmkaro.dev", "EMPLOYEE", "Finance"],
  ] as const;
  const users = [];
  for (const [name, email, , title] of people) {
    users.push(await prisma.user.create({
      data: { name, email, passwordHash, emailVerified: new Date(), locale: "en", onboardingDone: title !== "Founder" },
    }));
  }
  const org = await prisma.organization.create({
    data: {
      name: "Indus Collective",
      slug: "indus-collective",
      timezone: ZONE,
      labels: {
        create: [
          { name: "client", color: "#e8610a" },
          { name: "design", color: "#312e81" },
          { name: "finance", color: "#0f766e" },
          { name: "ops", color: "#57534e" },
          { name: "urgent", color: "#b91c1c" },
        ],
      },
    },
  });
  for (let index = 0; index < people.length; index++) {
    await prisma.membership.create({
      data: { userId: users[index].id, organizationId: org.id, role: people[index][2], title: people[index][3] },
    });
    await prisma.user.update({ where: { id: users[index].id }, data: { activeOrganizationId: org.id } });
  }
  const [aanya, arjun, rahul, priya, ananya, vikram, meera] = users;
  const labels = await prisma.label.findMany({ where: { organizationId: org.id } });
  const label = (name: string) => labels.find((item) => item.name === name)!.id;

  async function project(name: string, color: string, members: string[], sections: string[]) {
    return prisma.project.create({
      data: {
        organizationId: org.id,
        name,
        color,
        members: { create: members.map((userId, index) => ({ userId, role: index === 0 ? "OWNER" : "EDITOR" })) },
        sections: { create: sections.map((section, index) => ({ name: section, position: index })) },
      },
      include: { sections: true },
    });
  }
  const delivery = await project("Client Delivery", "#e8610a", [arjun.id, rahul.id, priya.id, vikram.id], ["Discovery", "Build", "Handoff"]);
  const festival = await project("Festival Campaign", "#312e81", [arjun.id, ananya.id, priya.id, rahul.id], ["Content", "Partnerships"]);
  const ops = await project("Studio Ops", "#0f766e", [aanya.id, arjun.id, meera.id, vikram.id], ["This week"]);

  const samples: {
    title: string;
    projectId?: string;
    section?: number;
    assignees: string[];
    reporter: string;
    priority: number;
    due: Date | null;
    status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    labels: string[];
    description?: string;
    estimate?: number;
  }[] = [
    { title: "Send the client report", projectId: delivery.id, section: 2, assignees: [rahul.id], reporter: arjun.id, priority: 1, due: at(1, 17), status: "TODO", labels: ["client", "urgent"], estimate: 90 },
    { title: "Revise the homepage hero", projectId: delivery.id, section: 1, assignees: [rahul.id], reporter: priya.id, priority: 2, due: at(0, 16), status: "IN_PROGRESS", labels: ["design"], estimate: 120 },
    { title: "Fix the checkout copy", projectId: delivery.id, section: 1, assignees: [vikram.id], reporter: arjun.id, priority: 1, due: at(-1, 18), status: "TODO", labels: ["client", "urgent"], estimate: 60 },
    { title: "Record the walkthrough", projectId: delivery.id, section: 2, assignees: [priya.id], reporter: arjun.id, priority: 3, due: at(2, 15), status: "TODO", labels: ["client"], estimate: 45 },
    { title: "Share the staging link", projectId: delivery.id, section: 2, assignees: [vikram.id, priya.id], reporter: arjun.id, priority: 2, due: at(0, 12), status: "IN_REVIEW", labels: ["client"] },
    { title: "Close last week's bugs", projectId: delivery.id, section: 1, assignees: [vikram.id], reporter: arjun.id, priority: 2, due: at(-3, 18), status: "DONE", labels: ["ops"] },
    { title: "Write the marigold reel script", projectId: festival.id, section: 0, assignees: [ananya.id], reporter: priya.id, priority: 2, due: at(0, 18), status: "IN_PROGRESS", labels: ["design"], estimate: 80 },
    { title: "Cut the 15-second reel", projectId: festival.id, section: 0, assignees: [priya.id], reporter: ananya.id, priority: 1, due: at(1, 19), status: "TODO", labels: ["design", "urgent"], estimate: 150 },
    { title: "Confirm the print vendor", projectId: festival.id, section: 1, assignees: [meera.id], reporter: arjun.id, priority: 2, due: at(-2, 11), status: "TODO", labels: ["finance"] },
    { title: "Draft the partner email", projectId: festival.id, section: 1, assignees: [ananya.id], reporter: arjun.id, priority: 3, due: at(3, 11), status: "TODO", labels: ["client"] },
    { title: "Approve the poster colors", projectId: festival.id, section: 0, assignees: [rahul.id], reporter: priya.id, priority: 2, due: at(0, 17), status: "IN_REVIEW", labels: ["design"] },
    { title: "Book the community hall", projectId: festival.id, section: 1, assignees: [priya.id], reporter: arjun.id, priority: 1, due: at(-4, 10), status: "DONE", labels: ["ops"] },
    { title: "Review invoices", projectId: ops.id, section: 0, assignees: [meera.id], reporter: aanya.id, priority: 2, due: at(5, 9, 30), status: "TODO", labels: ["finance"], description: "Every Monday." },
    { title: "Update the leave sheet", projectId: ops.id, section: 0, assignees: [arjun.id], reporter: aanya.id, priority: 4, due: at(4, 18), status: "TODO", labels: ["ops"] },
    { title: "Renew the font licenses", projectId: ops.id, section: 0, assignees: [meera.id], reporter: aanya.id, priority: 3, due: at(6, 12), status: "TODO", labels: ["finance"] },
    { title: "Back up the shared drive", projectId: ops.id, section: 0, assignees: [vikram.id], reporter: arjun.id, priority: 2, due: at(-1, 9), status: "IN_PROGRESS", labels: ["ops"] },
    { title: "Prepare Friday standup notes", assignees: [arjun.id], reporter: arjun.id, priority: 3, due: at(1, 9, 30), status: "TODO", labels: ["ops"] },
    { title: "Call the landlord", assignees: [aanya.id], reporter: aanya.id, priority: 2, due: at(0, 11), status: "TODO", labels: ["ops"] },
    { title: "Collect testimonials", projectId: delivery.id, section: 0, assignees: [ananya.id], reporter: priya.id, priority: 4, due: at(8, 16), status: "TODO", labels: ["client"] },
    { title: "Sketch the packing insert", projectId: festival.id, section: 0, assignees: [rahul.id], reporter: ananya.id, priority: 3, due: at(2, 14), status: "TODO", labels: ["design"], estimate: 70 },
    { title: "Price the courier options", projectId: festival.id, section: 1, assignees: [meera.id], reporter: arjun.id, priority: 2, due: at(1, 13), status: "TODO", labels: ["finance"] },
    { title: "QA the mobile menu", projectId: delivery.id, section: 1, assignees: [vikram.id, rahul.id], reporter: priya.id, priority: 1, due: at(0, 19), status: "TODO", labels: ["urgent"], estimate: 50 },
    { title: "Send the recap to the client", projectId: delivery.id, section: 2, assignees: [priya.id], reporter: arjun.id, priority: 2, due: at(-5, 17), status: "DONE", labels: ["client"] },
    { title: "File last month's GST notes", projectId: ops.id, section: 0, assignees: [meera.id], reporter: aanya.id, priority: 1, due: at(-2, 16), status: "IN_REVIEW", labels: ["finance", "urgent"] },
    { title: "Outline the case study", projectId: delivery.id, section: 0, assignees: [ananya.id], reporter: aanya.id, priority: 3, due: at(7, 15), status: "TODO", labels: ["client"] },
    { title: "Source marigold fabric swatches", projectId: festival.id, section: 1, assignees: [rahul.id], reporter: priya.id, priority: 4, due: at(3, 12), status: "TODO", labels: ["design"] },
    { title: "Personal: read the brief on the train", assignees: [rahul.id], reporter: rahul.id, priority: 4, due: at(0, 8), status: "TODO", labels: [] },
    { title: "Personal: block focus time", assignees: [priya.id], reporter: priya.id, priority: 3, due: null, status: "TODO", labels: [] },
    { title: "Ship the press release", projectId: festival.id, section: 0, assignees: [ananya.id, priya.id], reporter: arjun.id, priority: 2, due: at(4, 10), status: "TODO", labels: ["client"] },
    { title: "Retire the old landing page", projectId: delivery.id, section: 1, assignees: [vikram.id], reporter: arjun.id, priority: 4, due: at(9, 18), status: "TODO", labels: ["ops"] },
  ];

  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
    const sectionId = sample.projectId
      ? (sample.projectId === delivery.id ? delivery : sample.projectId === festival.id ? festival : ops).sections[sample.section ?? 0]?.id
      : undefined;
    const task = await prisma.task.create({
      data: {
        organizationId: org.id,
        projectId: sample.projectId,
        sectionId,
        title: sample.title,
        description: sample.description,
        status: sample.status,
        priority: sample.priority,
        dueAt: sample.due,
        estimateMinutes: sample.estimate,
        reporterId: sample.reporter,
        position: index + 1,
        completedAt: sample.status === "DONE" ? at(-1, 18) : null,
        assignees: { create: sample.assignees.map((userId) => ({ userId })) },
        labels: { create: sample.labels.map((name) => ({ labelId: label(name) })) },
      },
    });
    if (sample.title === "Send the client report") {
      await prisma.checklistItem.createMany({
        data: ["Pull the numbers", "Write the narrative", "Export the PDF"].map((title, position) => ({ taskId: task.id, title, position, done: position === 0 })),
      });
      await prisma.comment.create({
        data: { taskId: task.id, authorId: arjun.id, body: "@Rahul the client asked for the Hindi summary on page two." },
      });
    }
    if (sample.title === "Cut the 15-second reel") {
      for (const [title, position] of [["Pick the shots", 0], ["Add captions", 1], ["Export for WhatsApp", 2]] as const) {
        await prisma.task.create({
          data: {
            organizationId: org.id,
            parentId: task.id,
            projectId: festival.id,
            title,
            reporterId: priya.id,
            position,
            priority: 3,
            assignees: { create: [{ userId: priya.id }] },
          },
        });
      }
    }
  }

  const invoices = await prisma.task.findFirst({ where: { title: "Review invoices", organizationId: org.id } });
  if (invoices) {
    await prisma.recurringRule.create({
      data: { taskId: invoices.id, frequency: "WEEKLY", interval: 1, byWeekday: [1], timezone: ZONE, nextRunAt: invoices.dueAt },
    });
    await prisma.reminder.create({
      data: { taskId: invoices.id, userId: meera.id, remindAt: invoices.dueAt ?? new Date(), channel: "IN_APP" },
    });
  }

  await prisma.savedFilter.create({
    data: { organizationId: org.id, userId: arjun.id, name: "My urgent week", query: "priority:P1 AND assignee:me AND due:this week" },
  });
  await prisma.activityLog.createMany({
    data: [
      { organizationId: org.id, actorId: aanya.id, action: "auth.login", entityType: "user", entityId: aanya.id },
      { organizationId: org.id, actorId: arjun.id, action: "task.created", entityType: "task", entityId: invoices?.id, metadata: { title: "Review invoices" } },
      { organizationId: org.id, actorId: arjun.id, action: "task.assigned", entityType: "task", entityId: invoices?.id, metadata: { userId: meera.id } },
    ],
  });
  console.log("Seeded Indus Collective");
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
