/** Hashing and comparison helpers. */
import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * One-way hash of a client IP. Lets us rate-limit and spot abuse patterns
 * without storing an identifier we would rather not hold.
 */
export function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHmac('sha256', env.IP_SALT).update(String(ip)).digest('hex').slice(0, 32);
}

/** Timing-safe string comparison that tolerates differing lengths. */
export function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  if (left.length !== right.length) {
    // Still burn a comparison so the failure path costs roughly the same.
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');

export default { hashIp, safeEqual, randomToken };
