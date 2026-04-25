/**
 * middleware/structuredErrorHandler.js
 * 
 * Centralized error handling with structured logging
 * Should be used as the last middleware in Express
 */

const logger = require('../utils/logger');

/**
 * Structured error handling middleware
 * Must be defined after all other middleware and routes
 */
const structuredErrorHandler = (err, req, res, next) => {
  // Determine error status code
  const statusCode = err.statusCode || err.status || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;
  const isServerError = statusCode >= 500;

  // Build error context
  const errorContext = {
    requestId: req.id || req.requestId,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    statusCode,
    errorType: err.constructor.name,
    errorCode: err.code,
    validation: err.validation, // For validation errors
    details: err.details // Additional error details
  };

  // Log the error with appropriate level
  if (isServerError) {
    logger.error(`Server Error: ${err.message}`, {
      ...errorContext,
      stack: err.stack,
      ...(err.originalError && { originalError: err.originalError })
    });
  } else if (isClientError) {
    logger.warn(`Client Error: ${err.message}`, {
      ...errorContext,
      // Don't include stack trace for client errors
    });
  } else {
    logger.info(`Error: ${err.message}`, errorContext);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message,
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    },
    requestId: req.id || req.requestId,
    ...(process.env.NODE_ENV === 'development' && { details: err.details })
  });
};

/**
 * Custom error class for structured errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'ERROR', details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  structuredErrorHandler,
  AppError
};
