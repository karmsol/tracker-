import { errorResponse } from "@/lib/http";
import { hashPassword, hashToken } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validators";
import { assertSameOrigin } from "@/server/router";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = z.object({ token: z.string().min(20), password: passwordSchema }).parse(await request.json());
    const row = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(body.token) } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return Response.json({ error: "This reset link is no longer valid" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(body.password), failedLogins: 0, lockedUntil: null },
    });
    await prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
