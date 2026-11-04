import { emailLinksExposed, emailShell, sendEmail, appUrl } from "@/lib/email";
import { errorResponse } from "@/lib/http";
import { hashPassword, hashToken, newToken } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validators";
import { assertSameOrigin } from "@/server/router";
import { createWorkspace } from "@/server/org";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`signup:${request.headers.get("x-forwarded-for") ?? "local"}`, 8, 60 * 60 * 1000);
    const body = signupSchema.parse(await request.json());
    const email = body.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return Response.json({ error: "An account with that email already exists" }, { status: 409 });
    const user = await prisma.user.create({
      data: { name: body.name.trim(), email, passwordHash: await hashPassword(body.password) },
    });
    await createWorkspace({ name: body.organization, userId: user.id });
    const token = newToken();
    await prisma.emailVerification.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) },
    });
    const verifyUrl = appUrl(`/api/auth/verify?token=${token}`);
    await sendEmail({
      to: email,
      subject: "Confirm your Karm Karo account",
      html: emailShell("Confirm your email", `<p><a href="${verifyUrl}">Verify ${email}</a></p>`),
    });
    return Response.json({ ok: true, verifyUrl: emailLinksExposed() ? verifyUrl : undefined });
  } catch (error) {
    return errorResponse(error);
  }
}
