/**
 * Turns a schema into middleware.
 *
 * On success the cleaned values land on `req.valid`; the raw body is never used
 * past this point. On failure a 422 carries a field -> message map that the
 * front end renders inline.
 */
import { validate as runValidation } from '../utils/schema.js';
import { unprocessable } from '../utils/http-error.js';

export function validateBody(schema) {
  return function validator(req, res, next) {
    const { values, errors, trapped } = runValidation(schema, req.body);

    if (Object.keys(errors).length > 0) {
      next(unprocessable('Please check the highlighted fields.', errors));
      return;
    }

    req.valid = values;
    // A filled honeypot marks a bot. The route answers 200 and discards it, so
    // the spammer gets no signal about what gave them away.
    req.isSpam = trapped;
    next();
  };
}

export default validateBody;
