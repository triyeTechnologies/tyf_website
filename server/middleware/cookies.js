/** Minimal cookie read/write — only the admin session needs one. */
import { env } from '../config/env.js';

export function cookieParser(req, res, next) {
  req.cookies = Object.create(null);

  const header = req.get('cookie');
  if (header) {
    for (const part of header.split(';')) {
      const index = part.indexOf('=');
      if (index < 1) continue;
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      try {
        req.cookies[key] = decodeURIComponent(value);
      } catch {
        req.cookies[key] = value;
      }
    }
  }

  res.setCookie = (name, value, options = {}) => {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? '/'}`];
    if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    parts.push(`SameSite=${options.sameSite ?? 'Strict'}`);
    if (options.httpOnly !== false) parts.push('HttpOnly');
    if (options.secure ?? env.IS_PROD) parts.push('Secure');
    res.append('Set-Cookie', parts.join('; '));
  };

  res.clearCookie = (name, options = {}) => res.setCookie(name, '', { ...options, maxAge: 0 });

  next();
}

export default cookieParser;
