import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Buckets never expire on their own between hits, so a long-idle process
// would otherwise leak one Map entry per distinct key forever. Swept
// opportunistically (not on a timer) since this is a low-traffic personal
// deploy, not because precision matters here.
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

function sweepExpired(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

/**
 * Fixed-window limiter, in memory. Fine for a single Fly.io machine
 * (this app's fly.toml pins min_machines_running = 1, no autoscaling) --
 * if that ever changes, this needs to move to a shared store (e.g. Upstash
 * Redis), since each instance would otherwise track its own count and the
 * effective limit would multiply by instance count.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweepExpired(now);
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Fly.io (and most proxies) set x-forwarded-for; falls back to fly-client-ip, then a constant so local dev still shares one bucket. */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("fly-client-ip") ?? "unknown";
}

export const RATE_LIMIT_MESSAGE = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
