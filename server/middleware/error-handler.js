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
import { captureServerError, flush as flushSentry } from '../utils/sentry.js';
import { renderErrorPage } from '../views/error.view.js';

/**
 * The body parser reports a malformed or oversized body by throwing an error
 * that carries a status but is not an HttpError. Left to the unknown branch
 * below, a caller sending junk gets a 500 — the server taking the blame for
 * the client's mistake, and a stack trace in the log for every bot that probes
 * the endpoint. We answer with our own wording rather than the library's, so
 * nothing about the internals travels with it.
 */
const CLIENT_FAULTS = {
  400: ['malformed_body', 'That request body could not be read.'],
  413: ['payload_too_large', 'That request is too large.'],
  415: ['unsupported_media_type', 'That content type is not supported here.'],
};

function classify(error) {
  if (error instanceof HttpError) {
    return { status: error.status, code: error.code, message: error.message, known: true };
  }

  const stated = Number(error?.status ?? error?.statusCode);
  if (Number.isInteger(stated) && stated >= 400 && stated < 500) {
    const [code, message] = CLIENT_FAULTS[stated] ?? ['bad_request', 'That request could not be handled.'];
    return { status: stated, code, message, known: false, clientFault: true };
  }

  return { status: 500, code: 'internal_error', message: 'Something went wrong on our side.', known: false };
}

export async function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { status, code, message, known, clientFault } = classify(error);

  if (clientFault) {
    // Their fault, not ours: one line, no stack, and not counted as an error.
    logger.debug(`${status} on ${req.method} ${req.originalUrl}: ${error.message}`);
  } else if (!known) {
    logger.error(`unhandled error on ${req.method} ${req.originalUrl} [${req.id}]`, error);
  } else if (status >= 500) {
    logger.error(`${status} on ${req.method} ${req.originalUrl}:`, error.message);
  }

  // Only genuine server faults are worth waking someone for. A 4xx is the
  // caller being wrong, and reporting those would bury the real ones.
  if (status >= 500) {
    captureServerError(error, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status,
    });
    // Flush before answering, not after: on Vercel the instance is frozen the
    // moment the response ends, taking the unsent queue with it. The wait is
    // only ever paid on a request that has already failed.
    await flushSentry();
  }

  if (error.headers) {
    for (const [key, value] of Object.entries(error.headers)) res.setHeader(key, value);
  }

  res.status(status);

  if (wantsJson(req)) {
    res.json({
      ok: false,
      error: {
        code,
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
      // Only ever for a genuine server-side fault, and only in development.
      stack: env.IS_DEV && status >= 500 ? error.stack : null,
    }),
  );
}

export default errorHandler;
