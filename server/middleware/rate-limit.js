/**
 * Fixed-window rate limiting, in memory.
 *
 * Good enough for a single-process landing site and honest about its limits:
 * counters reset on restart and are not shared between instances. Swap the Map
 * for Redis if this ever runs on more than one box.
 */
import { env } from '../config/env.js';
import { tooManyRequests } from '../utils/http-error.js';
import { clientIp } from '../utils/request.js';

const buckets = new Map();

// Drop expired buckets periodically so a long uptime cannot grow the Map.
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000);
sweeper.unref?.();

/**
 * @param {{ name: string, max?: number, windowMs?: number, message?: string }} options
 */
export function rateLimit({
  name,
  max = env.RATE_LIMIT.WRITE_MAX,
  windowMs = env.RATE_LIMIT.WINDOW_MS,
  message = 'Too many requests. Give it a minute and try again.',
}) {
  return function rateLimiter(req, res, next) {
    const key = `${name}:${clientIp(req) ?? 'unknown'}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > max) {
      next(tooManyRequests(message, resetSeconds));
      return;
    }

    next();
  };
}

/** Test/maintenance helper. */
export const resetRateLimits = () => buckets.clear();

export default rateLimit;
