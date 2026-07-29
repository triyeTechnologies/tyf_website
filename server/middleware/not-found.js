/** Terminal 404 — JSON for the API, a small page for everything else. */
import { notFound as notFoundError } from '../utils/http-error.js';
import { wantsJson } from '../utils/request.js';

export function notFoundHandler(req, res, next) {
  next(notFoundError(wantsJson(req) ? `No route for ${req.method} ${req.path}` : 'Page not found.'));
}

export default notFoundHandler;
