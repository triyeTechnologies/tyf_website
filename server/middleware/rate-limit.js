/**
 * Rate limiting, shared across instances when Redis is available.
 *
 * Serverless breaks in-memory counters: every warm instance keeps its own, so
 * "8 per 15 minutes" quietly becomes "8 per instance". Upstash gives all of
 * them one counter to agree on.
 *
 * Without Upstash credentials this falls back to the in-memory limiter, which
 * is correct on a single long-running server and merely weak on serverless.
 * That keeps local development free of a network dependency.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { tooManyRequests } from '../utils/http-error.js';
import { clientIp } from '../utils/request.js';

/* ── shared backend ─────────────────────────────────────────────────────── */

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

export const isDistributed = redis !== null;

if (!isDistributed && env.IS_SERVERLESS) {
  logger.warn('No Upstash credentials — rate limits are per-instance and therefore weak.');
}

/* ── in-memory fallback ─────────────────────────────────────────────────── */

const buckets = new Map();

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000);
sweeper.unref?.();

function checkInMemory(key, max, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  return {
    success: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
    resetSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/* ── middleware ─────────────────────────────────────────────────────────── */

// One Ratelimit instance per named limit, built once and reused. Rebuilding
// per request would leak connections on every invocation.
const limiters = new Map();

function getLimiter(name, max, windowMs) {
  if (!limiters.has(name)) {
    limiters.set(
      name,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, `${Math.ceil(windowMs / 1000)} s`),
        prefix: `tyf:rl:${name}`,
        analytics: false,
      }),
    );
  }
  return limiters.get(name);
}

/**
 * @param {{ name: string, max?: number, windowMs?: number, message?: string }} options
 */
export function rateLimit({
  name,
  max = env.RATE_LIMIT.WRITE_MAX,
  windowMs = env.RATE_LIMIT.WINDOW_MS,
  message = 'Too many requests. Give it a minute and try again.',
}) {
  return async function rateLimiter(req, res, next) {
    const identifier = clientIp(req) ?? 'unknown';

    try {
      let outcome;

      if (isDistributed) {
        const result = await getLimiter(name, max, windowMs).limit(identifier);
        outcome = {
          success: result.success,
          remaining: result.remaining,
          resetSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
        };
      } else {
        outcome = checkInMemory(`${name}:${identifier}`, max, windowMs);
      }

      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(outcome.remaining));
      res.setHeader('RateLimit-Reset', String(outcome.resetSeconds));

      if (!outcome.success) {
        next(tooManyRequests(message, outcome.resetSeconds));
        return;
      }

      next();
    } catch (error) {
      // Redis being unreachable must not take the signup form down with it.
      logger.error('rate limiter unavailable, allowing the request:', error.message);
      next();
    }
  };
}

/** Test/maintenance helper — only affects the in-memory fallback. */
export const resetRateLimits = () => buckets.clear();

export default rateLimit;
