/** One line per request, once the response is on its way out. */
import { logger } from '../utils/logger.js';
import { elapsedMs } from './request-context.js';

export function requestLogger(req, res, next) {
  res.on('finish', () => {
    // Static assets are noise in the log; only surface them when they fail.
    const isAsset = /\.(?:css|js|jpg|jpeg|png|svg|webp|ico|woff2?|map|txt)$/i.test(req.path);
    if (isAsset && res.statusCode < 400) return;

    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs(req).toFixed(1)}ms`;
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.info(line);
  });
  next();
}

export default requestLogger;
