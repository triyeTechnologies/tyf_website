/**
 * Wraps an async route handler so rejections reach the error middleware.
 *
 * Express 5 already forwards rejected promises, but wrapping keeps the intent
 * explicit at every call site and keeps the handlers portable.
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export default asyncHandler;
