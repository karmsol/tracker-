import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { emailShell, sendEmail, appUrl } from "./email";
import { log } from "./log";
import { prisma } from "./prisma";
import { publish } from "./realtime";
import { getZonedParts, startOfZonedDay } from "./zoned";
import { digestFor, weeklyFor } from "@/server/ai";
import type { AppContext } from "./session";

const globalForJobs = globalThis as unknown as { karmJobs?: boolean };

async function contextFor(userId: string, organizationId: string): Promise<AppContext | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId, active: true },
    include: { user: true, organization: true },
  });
  if (!membership) return null;
  return {
    user: {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      locale: membership.user.locale,
      theme: membership.user.theme,
      onboardingDone: membership.user.onboardingDone,
      image: membership.user.image,
    },
    role: membership.role,
    organizationId,
    org: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      timezone: membership.organization.timezone,
      workingDays: membership.organization.workingDays,
      workStart: membership.organization.workStart,
      workEnd: membership.organization.workEnd,
      notifyOnAssign: membership.organization.notifyOnAssign,
      emailOnAssign: membership.organization.emailOnAssign,
      digestHour: membership.organization.digestHour,
      weeklyReportDay: membership.organization.weeklyReportDay,
      logoKey: membership.organization.logoKey,
    },
    ip: "job",
  };
}

export async function runJobs() {
  const now = new Date();
  const due = await prisma.reminder.findMany({
    where: { sentAt: null, remindAt: { lte: now } },
    include: { task: true, user: true },
    take: 100,
  });
  for (const reminder of due) {
    if (reminder.task.deletedAt || reminder.task.status === "DONE") {
      await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: now } });
      continue;
    }
    const title = `Reminder: ${reminder.task.title}`;
    await prisma.notification.create({
      data: {
        organizationId: reminder.task.organizationId,
        userId: reminder.userId,
        type: "reminder",
        title,
        body: "This is due.",
        link: `/assigned?task=${reminder.task.id}`,
      },
    });
    publish(reminder.userId, { type: "reminder", title, body: reminder.task.title, link: `/assigned?task=${reminder.task.id}` });
    if (reminder.channel === "EMAIL") {
      await sendEmail({
        to: reminder.user.email,
        subject: title,
        organizationId: reminder.task.organizationId,
        html: emailShell(title, `<p><a href="${appUrl(`/assigned?task=${reminder.task.id}`)}">Open the task</a></p>`),
      });
    }
    await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: now } });
  }

  const orgs = await prisma.organization.findMany({ include: { memberships: { where: { active: true }, include: { user: true } } } });
  for (const org of orgs) {
    const hour = getZonedParts(now, org.timezone).hour;
    const weekday = getZonedParts(now, org.timezone).weekday;
    if (hour !== org.digestHour) continue;
    const start = startOfZonedDay(now, org.timezone);
    for (const membership of org.memberships) {
      const already = await prisma.notification.findFirst({
        where: { userId: membership.userId, type: "digest", createdAt: { gte: start } },
      });
      if (already) continue;
      const ctx = await contextFor(membership.userId, org.id);
      if (!ctx) continue;
      const digest = await digestFor(ctx);
      await prisma.notification.create({
        data: {
          organizationId: org.id,
          userId: membership.userId,
          type: "digest",
          title: "This morning",
          body: digest.narrative,
          link: "/today",
        },
      });
      publish(membership.userId, { type: "digest", title: "This morning", body: digest.narrative, link: "/today" });
      await sendEmail({
        to: membership.user.email,
        subject: `This morning at ${org.name}`,
        organizationId: org.id,
        html: emailShell("This morning", `<p>${digest.narrative}</p><ul>${digest.tasks.map((task) => `<li>P${task.priority} ${task.title}</li>`).join("")}</ul>`),
      });
      if (weekday === org.weeklyReportDay && (membership.role === "ADMIN" || membership.role === "SUPER_ADMIN")) {
        const weekly = await weeklyFor(ctx);
        await prisma.notification.create({
          data: {
            organizationId: org.id,
            userId: membership.userId,
            type: "weekly",
            title: "Week in review",
            body: weekly.narrative,
            link: "/admin/reports",
          },
        });
        await sendEmail({
          to: membership.user.email,
          subject: `Week in review — ${org.name}`,
          organizationId: org.id,
          html: emailShell("Week in review", `<p>${weekly.narrative}</p>`),
        });
      }
    }
  }
}

export function startScheduler() {
  if (globalForJobs.karmJobs) return;
  globalForJobs.karmJobs = true;
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
      const workerConnection = connection.duplicate();
      const onRedisError = (error: Error) => log("warn", "Redis connection error", { error: error.message });
      connection.on("error", onRedisError);
      workerConnection.on("error", onRedisError);
      const queue = new Queue("karm-karo", { connection });
      queue
        .upsertJobScheduler("karm-tick", { every: 60_000 }, { name: "tick", data: {} })
        .catch((error) => log("error", "Could not schedule BullMQ tick", { error: String(error) }));
      const worker = new Worker("karm-karo", async () => runJobs(), { connection: workerConnection });
      worker.on("error", (error) => log("error", "BullMQ worker error", { error: error.message }));
      log("info", "BullMQ scheduler started");
      return;
    } catch (error) {
      log("warn", "Redis unavailable, using in-process cron", { error: String(error) });
    }
  }
  setInterval(() => {
    runJobs().catch((error) => log("error", "Job run failed", { error: String(error) }));
  }, 60_000);
  runJobs().catch((error) => log("error", "Job run failed", { error: String(error) }));
  log("info", "In-process scheduler started");
}
