/**
 * Central error handling middleware.
 *
 * Express recognises this as an error handler because it has 4 parameters.
 * Every route can just `throw` or call `next(err)` and it lands here.
 *
 * Interview note: "I use a central error handler so individual routes don't
 * need try/catch boilerplate — keeps the route logic clean."
 */
function errorHandler(err, req, res, next) {
  // Default to 500 if no status was set
  const statusCode = err.statusCode || 500;

  // In development, include the stack trace; in production, hide internals
  const response = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  };

  // Log server errors (5xx) — client errors (4xx) are expected
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
