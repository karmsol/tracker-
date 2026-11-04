import { appUrl, emailLinksExposed, emailShell, sendEmail } from "@/lib/email";
import { errorResponse } from "@/lib/http";
import { hashToken, newToken } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/server/router";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`forgot:${request.headers.get("x-forwarded-for") ?? "local"}`, 6, 15 * 60 * 1000);
    const body = z.object({ email: z.string().email() }).parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) return Response.json({ ok: true });
    const token = newToken();
    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const url = appUrl(`/reset/${token}`);
    await sendEmail({
      to: user.email,
      subject: "Reset your Karm Karo password",
      html: emailShell("Reset your password", `<p><a href="${url}">Choose a new password</a>. The link lasts one hour.</p>`),
    });
    return Response.json({ ok: true, resetUrl: emailLinksExposed() ? url : undefined });
  } catch (error) {
    return errorResponse(error);
  }
}
