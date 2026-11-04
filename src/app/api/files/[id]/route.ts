import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireContext } from "@/lib/session";
import { getObject } from "@/lib/storage";
import { can } from "@/lib/permissions";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireContext();
    const { id } = await context.params;
    const file = await prisma.attachment.findFirst({
      where: { id, task: { organizationId: ctx.organizationId, deletedAt: null } },
      include: { task: { include: { assignees: true, project: { include: { members: true } } } } },
    });
    if (!file) return Response.json({ error: "Not found" }, { status: 404 });
    const allowed =
      can(ctx.role, "task.readAll") ||
      file.task.reporterId === ctx.user.id ||
      file.task.assignees.some((item) => item.userId === ctx.user.id) ||
      file.task.project?.members.some((item) => item.userId === ctx.user.id);
    if (!allowed) return Response.json({ error: "Not found" }, { status: 404 });
    const bytes = await getObject(file.storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
