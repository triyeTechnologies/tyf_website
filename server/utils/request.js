/** Helpers for reading things off the request consistently. */

/** Client IP, honouring the `trust proxy` setting configured on the app. */
export const clientIp = (req) => req.ip || req.socket?.remoteAddress || null;

export const userAgent = (req) => (req.get('user-agent') || '').slice(0, 300) || null;

export const referrer = (req) => (req.get('referer') || '').slice(0, 300) || null;

/** True when the caller wants JSON back rather than a rendered page. */
export const wantsJson = (req) =>
  req.xhr ||
  req.path.startsWith('/api/') ||
  (req.get('accept') || '').includes('application/json');

export default { clientIp, userAgent, referrer, wantsJson };
