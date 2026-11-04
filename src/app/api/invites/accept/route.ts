import { errorResponse } from "@/lib/http";
import { acceptInviteSchema } from "@/lib/validators";
import { assertSameOrigin } from "@/server/router";
import { acceptInvite } from "@/server/org";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = acceptInviteSchema.parse(await request.json());
    return Response.json(await acceptInvite(body));
  } catch (error) {
    return errorResponse(error);
  }
}
