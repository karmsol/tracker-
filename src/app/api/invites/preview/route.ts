import { previewInvite } from "@/server/org";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const invite = await previewInvite(token);
  if (!invite) return Response.json({ error: "This invite is no longer valid" }, { status: 404 });
  return Response.json(invite);
}
