/**
 * Admin access: a single shared token.
 *
 * Deliberately simple — there is one team and no user accounts to manage. The
 * token arrives as a Bearer header (for scripts) or a signed-in cookie (for the
 * browser), and is compared in constant time.
 */
import { env } from '../config/env.js';
import { safeEqual } from '../utils/crypto.js';
import { wantsJson } from '../utils/request.js';
import { unauthorized } from '../utils/http-error.js';

export const ADMIN_COOKIE = 'tyf_admin';

function presentedToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const custom = req.get('x-admin-token');
  if (custom) return custom.trim();
  return req.cookies?.[ADMIN_COOKIE] ?? '';
}

export const isAuthorised = (req) => {
  const token = presentedToken(req);
  return token !== '' && safeEqual(token, env.ADMIN_TOKEN);
};

/** Blocks the request unless a valid token is present. */
export function requireAdmin(req, res, next) {
  if (isAuthorised(req)) {
    // Never let a proxy or the browser hold on to admin pages.
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
    return;
  }

  if (wantsJson(req)) {
    next(unauthorized('A valid admin token is required.'));
    return;
  }

  res.redirect(302, `/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
}

export default requireAdmin;
