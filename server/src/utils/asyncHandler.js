/**
 * Wraps an async Express handler so rejected promises forward to error middleware.
 * @param {Function} fn - async (req, res, next) => ...
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
