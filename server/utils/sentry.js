/**
 * Error reporting.
 *
 * The logger tells you what happened while you are watching. This tells you
 * what happened while you were not — which, for a site that takes signups at
 * three in the morning, is most of the time.
 *
 * Three decisions worth stating, because each one is easy to get wrong:
 *
 *   · It is inert without SENTRY_DSN, exactly like the Upstash limiter. Local
 *     development reports nothing and needs no account.
 *
 *   · It reports server faults only. A malformed body or a failed validation
 *     is the caller's mistake, not a defect, and routing those here would
 *     rebuild the noise problem the error handler was just fixed to avoid: if
 *     every passing bot raises an alert, a real outage arrives as one more
 *     line in a list nobody reads.
 *
 *   · It scrubs the request before sending. This app handles email addresses
 *     and hashed IPs, and Sentry is a third party; the default SDK behaviour
 *     would attach the request body, which is where the email lives. Nothing
 *     below ships a body, a cookie, or an authorisation header.
 */
import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const isEnabled = Boolean(env.SENTRY_DSN);

/** Header names that must never leave this process. */
const SECRET_HEADERS = new Set(['authorization', 'cookie', 'x-admin-token']);

if (isEnabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Vercel sets the commit on every deployment, so an error can be traced to
    // the exact code that produced it rather than to "production".
    release: env.RELEASE || undefined,

    // Errors only. Tracing on a marketing site with two form endpoints buys
    // very little and costs an event on every request.
    tracesSampleRate: 0,

    // Never attach IPs or user identifiers automatically.
    sendDefaultPii: false,

    beforeSend(event) {
      if (event.request) {
        // The body is where the email address is. It never goes.
        delete event.request.data;
        delete event.request.cookies;

        if (event.request.headers) {
          for (const name of Object.keys(event.request.headers)) {
            if (SECRET_HEADERS.has(name.toLowerCase())) {
              event.request.headers[name] = '[redacted]';
            }
          }
        }

        // A query string can carry anything a form does.
        if (event.request.query_string) event.request.query_string = '[redacted]';
      }

      // Belt and braces: the connection string would otherwise travel inside a
      // pg error message.
      if (event.exception?.values) {
        for (const value of event.exception.values) {
          if (typeof value.value === 'string') {
            value.value = value.value.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, 'postgres://[redacted]');
          }
        }
      }

      return event;
    },
  });

  logger.debug(`sentry reporting to ${new URL(env.SENTRY_DSN).host}`);
}

/**
 * Reports a genuine server fault. Safe to call when Sentry is not configured.
 * @param {unknown} error
 * @param {{ requestId?: string, method?: string, url?: string, status?: number }} [context]
 */
export function captureServerError(error, context = {}) {
  if (!isEnabled) return;

  Sentry.withScope((scope) => {
    // The request id is printed in the log line and returned to the caller in
    // the error envelope, so one id ties the three together.
    if (context.requestId) scope.setTag('request_id', context.requestId);
    if (context.status) scope.setTag('status', String(context.status));
    if (context.method && context.url) scope.setContext('request', {
      method: context.method,
      url: context.url,
    });
    Sentry.captureException(error);
  });
}

/**
 * Waits for queued events to be sent.
 *
 * This matters on Vercel and nowhere else: a serverless instance is frozen the
 * moment it answers, and anything still in the queue is frozen with it. The
 * cost is paid only on a request that already failed.
 */
export async function flush(ms = 2000) {
  if (!isEnabled) return;
  try {
    await Sentry.flush(ms);
  } catch (error) {
    logger.warn('could not flush sentry events:', error.message);
  }
}

export default { isEnabled, captureServerError, flush };
