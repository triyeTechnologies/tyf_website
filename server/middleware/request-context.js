/** Gives every request an id and a start time, echoed back as a header. */
import crypto from 'node:crypto';

export function requestContext(req, res, next) {
  req.id = req.get('x-request-id')?.slice(0, 64) || crypto.randomUUID();
  req.startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', req.id);
  next();
}

/** Milliseconds elapsed since the request entered the app. */
export const elapsedMs = (req) =>
  Number(process.hrtime.bigint() - (req.startedAt ?? process.hrtime.bigint())) / 1e6;

export default requestContext;
