type Level = "info" | "warn" | "error";

export function log(level: Level, message: string, extra?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...extra,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

export async function captureException(error: unknown, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  log("error", message, { stack: error instanceof Error ? error.stack : undefined, ...extra });
  if (process.env.SENTRY_DSN) {
    log("warn", "SENTRY_DSN is set. Wire @sentry/nextjs in production to forward this error.");
  }
}
