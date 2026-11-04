import { LimitError } from "./errors";

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new LimitError("Too many attempts. Wait a few minutes and try again.");
  }
}
