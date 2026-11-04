import { auth } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/server/router";
import { createWorkspace } from "@/server/org";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Sign in to continue" }, { status: 401 });
    const existing = await prisma.membership.findFirst({ where: { userId: session.user.id, active: true } });
    if (existing) return Response.json({ ok: true, organizationId: existing.organizationId });
    const body = z.object({ organization: z.string().trim().min(2).max(80) }).parse(await request.json());
    const org = await createWorkspace({ name: body.organization, userId: session.user.id });
    return Response.json({ ok: true, organizationId: org.id });
  } catch (error) {
    return errorResponse(error);
  }
}
