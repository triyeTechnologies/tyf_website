/**
 * The single place errors become responses.
 *
 * Known failures (HttpError) keep their message and status. Everything else is
 * logged with a stack and reported as a generic 500 — no internals leak.
 */
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';
import { logger } from '../utils/logger.js';
import { wantsJson } from '../utils/request.js';
import { renderErrorPage } from '../views/error.view.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const known = error instanceof HttpError;
  const status = known ? error.status : 500;

  if (!known) {
    logger.error(`unhandled error on ${req.method} ${req.originalUrl} [${req.id}]`, error);
  } else if (status >= 500) {
    logger.error(`${status} on ${req.method} ${req.originalUrl}:`, error.message);
  }

  if (error.headers) {
    for (const [key, value] of Object.entries(error.headers)) res.setHeader(key, value);
  }

  const message = known ? error.message : 'Something went wrong on our side.';
  res.status(status);

  if (wantsJson(req)) {
    res.json({
      ok: false,
      error: {
        code: known ? error.code : 'internal_error',
        message,
        ...(known && error.details ? { details: error.details } : {}),
      },
      requestId: req.id,
    });
    return;
  }

  res.type('html').send(
    renderErrorPage({
      status,
      message,
      requestId: req.id,
      stack: env.IS_DEV && !known ? error.stack : null,
    }),
  );
}

export default errorHandler;
