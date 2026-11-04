import { randomUUID } from "node:crypto";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireContext } from "@/lib/session";
import { putObject } from "@/lib/storage";
import { assertSameOrigin } from "@/server/router";
import { audit } from "@/server/notify";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ctx = await requireContext();
    const form = await request.formData();
    const taskId = String(form.get("taskId") ?? "");
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose a file" }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Files must be under 8 MB" }, { status: 400 });
    if (!ALLOWED.has(file.type)) return Response.json({ error: "Use a PNG, JPG, WEBP, GIF, PDF, or text file" }, { status: 400 });
    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: ctx.organizationId, deletedAt: null } });
    if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const key = `${ctx.organizationId}/${taskId}/${randomUUID()}-${safeName}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await putObject(key, bytes, file.type);
    const attachment = await prisma.attachment.create({
      data: { taskId, uploadedById: ctx.user.id, filename: safeName, mime: file.type, size: file.size, storageKey: key },
    });
    await audit(ctx, "task.attachment", "task", taskId, { filename: safeName });
    return Response.json({ id: attachment.id, filename: attachment.filename, size: attachment.size });
  } catch (error) {
    return errorResponse(error);
  }
}
