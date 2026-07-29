/**
 * CORS for the public API.
 *
 * Same-origin by default — the site and the API ship from one process, so no
 * cross-origin access is needed. Set ALLOWED_ORIGINS to open it up for an
 * embedded widget or a separate front end.
 */
import { env } from '../config/env.js';

export function cors(req, res, next) {
  const origin = req.get('origin');

  if (origin && env.ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

export default cors;
