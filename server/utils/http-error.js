/**
 * Errors that are safe to show a client.
 *
 * Anything thrown that is *not* an HttpError is treated by the error handler
 * as an unexpected failure: logged with a stack, reported as a generic 500.
 */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message human-readable, shown to the client
   * @param {{ code?: string, details?: unknown, headers?: Record<string,string> }} [options]
   */
  constructor(status, message, options = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options.code ?? defaultCode(status);
    this.details = options.details;
    this.headers = options.headers;
    this.expose = true;
  }
}

function defaultCode(status) {
  return (
    {
      400: 'bad_request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not_found',
      409: 'conflict',
      413: 'payload_too_large',
      415: 'unsupported_media_type',
      422: 'unprocessable',
      429: 'rate_limited',
    }[status] ?? 'error'
  );
}

export const badRequest = (message, details) =>
  new HttpError(400, message, { code: 'bad_request', details });

export const unauthorized = (message = 'Authentication required.') =>
  new HttpError(401, message);

export const forbidden = (message = 'Not allowed.') => new HttpError(403, message);

export const notFound = (message = 'Not found.') => new HttpError(404, message);

export const conflict = (message, details) =>
  new HttpError(409, message, { code: 'conflict', details });

export const unprocessable = (message, details) =>
  new HttpError(422, message, { code: 'validation_failed', details });

export const tooManyRequests = (message, retryAfterSeconds) =>
  new HttpError(429, message, {
    code: 'rate_limited',
    headers: retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : undefined,
  });

export default HttpError;
