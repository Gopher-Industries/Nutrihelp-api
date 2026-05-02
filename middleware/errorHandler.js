const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  // Log full error in dev
  logger.error(`Global Error Handler: ${err.message}`, { stack: err.stack, url: req.url, method: req.method });

  // Mask detailed errors in prod
  const errorMessage = process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message;

  // If headers already sent, delegate to default handler
  if (res.headersSent) return next(err);

  // Return standardized error
  res.status(err.status || 500).json({
    success: false,
    error: errorMessage,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
  });
};
