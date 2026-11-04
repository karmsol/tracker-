import type { Prisma } from "@/generated/prisma/client";
import { emailShell, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime";
import type { AppContext } from "@/lib/session";

export async function audit(
  ctx: AppContext,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, unknown>,
) {
  await prisma.activityLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorId: ctx.user.id,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: metadata as Prisma.InputJsonValue | undefined,
      ip: ctx.ip,
    },
  });
}

export async function notifyUser(
  ctx: AppContext,
  userId: string,
  input: { type: string; title: string; body: string; link?: string; email?: boolean },
) {
  await prisma.notification.create({
    data: {
      organizationId: ctx.organizationId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });
  publish(userId, { type: input.type, title: input.title, body: input.body, link: input.link });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (input.email && user) {
    await sendEmail({
      to: user.email,
      subject: input.title,
      organizationId: ctx.organizationId,
      html: emailShell(input.title, `<p>${escapeHtml(input.body)}</p>${input.link ? `<p><a href="${input.link}">Open in Karm Karo</a></p>` : ""}`),
    });
  }
  if (user?.pushEndpoint && user.pushP256dh && user.pushAuth && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      const webpush = await import("web-push");
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:work@karmkaro.dev",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
      await webpush.sendNotification(
        { endpoint: user.pushEndpoint, keys: { p256dh: user.pushP256dh, auth: user.pushAuth } },
        JSON.stringify({ title: input.title, body: input.body, link: input.link }),
      );
    } catch {
      // Push is optional. The in-app notification already landed.
    }
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export async function mentionsIn(body: string, organizationId: string) {
  const found = new Set<string>();
  const pattern = /@([\p{L}][\p{L} .'-]{1,60})/gu;
  const members = await prisma.membership.findMany({
    where: { organizationId, active: true },
    include: { user: true },
  });
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    const raw = match[1].trim().toLowerCase();
    const member = members.find((item) => item.user.name.toLowerCase() === raw || item.user.name.toLowerCase().startsWith(raw));
    if (member) found.add(member.userId);
  }
  return [...found];
}
