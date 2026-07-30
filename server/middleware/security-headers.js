/**
 * Security headers, hand-rolled so the policy is readable rather than hidden
 * behind a dependency's defaults.
 *
 * The CSP is tuned for exactly what the page loads:
 *   - Google Fonts (stylesheet + font files)
 *   - the Google Drive demo iframe
 *   - inline <style>/<script>, because the whole site is one file
 *
 * KEEP IN SYNC WITH vercel.json.
 * This middleware only sees requests that reach the Express function — on
 * Vercel that is /api/v1/* and /admin* alone. The site itself is served from
 * the CDN and never runs this code, so the same policy is repeated under
 * `headers` in vercel.json. Change one, change the other. The duplication is
 * the price of serving the page from the edge instead of through a function.
 */
import { env } from '../config/env.js';

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Fonts are served from this origin now, so nothing external is allowed to
  // supply one. A stylesheet injected into the page cannot pull a font from
  // anywhere else, and no visitor request leaves for a third party.
  "font-src 'self'",
  "img-src 'self' data: blob:",
  // The demo film is served from this origin, so nothing external is embedded.
  "media-src 'self'",
  "connect-src 'self'",
  // Kept only for the Drive embed, should you ever switch back to it.
  'frame-src https://drive.google.com',
  "manifest-src 'self'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  );

  if (env.ENABLE_CSP) res.setHeader('Content-Security-Policy', CSP);
  if (env.IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

export default securityHeaders;
