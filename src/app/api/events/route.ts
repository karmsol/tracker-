import { requireContext } from "@/lib/session";
import { subscribe } from "@/lib/realtime";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await requireContext();
    const encoder = new TextEncoder();
    let cleanup = () => {};
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: unknown) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            cleanup();
          }
        };
        send({ type: "hello" });
        const unsubscribe = subscribe(ctx.user.id, send);
        const ping = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            cleanup();
          }
        }, 15000);
        cleanup = () => {
          clearInterval(ping);
          unsubscribe();
        };
        request.signal.addEventListener("abort", cleanup);
      },
      cancel() {
        cleanup();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
