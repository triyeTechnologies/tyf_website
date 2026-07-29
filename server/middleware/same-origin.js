/**
 * Rejects state-changing requests that did not come from our own pages.
 *
 * The admin session lives in a SameSite=Strict cookie, which already stops the
 * classic CSRF flow; checking Origin as well means a form on another site
 * cannot post here even if the cookie policy is relaxed later.
 */
import { forbidden } from '../utils/http-error.js';

export function sameOriginOnly(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  const stated = req.get('origin') || req.get('referer');
  // Curl and other non-browser clients send neither; they authenticate with a
  // Bearer token instead, which no cross-site page can attach.
  if (!stated) {
    next();
    return;
  }

  try {
    if (new URL(stated).host === req.get('host')) {
      next();
      return;
    }
  } catch {
    /* fall through to the rejection below */
  }

  next(forbidden('Cross-site request blocked.'));
}

export default sameOriginOnly;
