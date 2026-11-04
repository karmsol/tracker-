export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.npm_lifecycle_event === "build") return;
  // Vercel instances are short-lived. The scheduled /api/cron route runs jobs there.
  if (process.env.VERCEL) return;
  const { startScheduler } = await import("./lib/jobs");
  startScheduler();
}
