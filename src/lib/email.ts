import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { log } from "./log";

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  organizationId?: string | null;
}) {
  await prisma.emailOutbox.create({
    data: {
      to: input.to,
      subject: input.subject,
      html: input.html,
      organizationId: input.organizationId ?? null,
    },
  });

  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Karm Karo <work@karmkaro.dev>",
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!response.ok) log("error", "Resend rejected an email", { status: response.status, to: input.to });
    return;
  }

  if (process.env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.EMAIL_FROM || "Karm Karo <work@karmkaro.dev>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return;
  }

  log("info", "Email kept in the outbox", { to: input.to, subject: input.subject });
}

export function emailShell(title: string, body: string) {
  return `<div style="font-family:Georgia,serif;background:#f6f1e8;padding:32px;color:#1c1917">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e7e0d4">
      <p style="margin:0 0 8px;letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:#e8610a">Karm Karo</p>
      <h1 style="font-size:24px;margin:0 0 12px">${title}</h1>
      <div style="font-family:sans-serif;font-size:15px;line-height:1.6">${body}</div>
    </div>
  </div>`;
}

export function appUrl(path: string) {
  const base = process.env.APP_URL || process.env.AUTH_URL || "http://127.0.0.1:43123";
  return `${base.replace(/\/$/, "")}${path}`;
}

export function emailLinksExposed() {
  return !process.env.RESEND_API_KEY && !process.env.SMTP_HOST;
}
