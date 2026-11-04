import { appUrl } from "@/lib/email";
import { hashToken } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const row = await prisma.emailVerification.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.expiresAt < new Date()) {
    return Response.redirect(appUrl("/login?error=verify"));
  }
  await prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } });
  await prisma.emailVerification.delete({ where: { id: row.id } });
  return Response.redirect(appUrl("/login?verified=1"));
}
