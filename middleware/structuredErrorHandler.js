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
  // Changed: allow statusCode to be updated for malformed JSON responses
  let statusCode = err.statusCode || err.status || 500;

  // Changed: detect malformed JSON so raw parser errors are not exposed
  const isMalformedJson =
    err instanceof SyntaxError &&
    statusCode === 400 &&
    Object.prototype.hasOwnProperty.call(err, 'body');

  const isClientError = statusCode >= 400 && statusCode < 500;
  const isServerError = statusCode >= 500;

  // Build error context
  const errorContext = {
    requestId: req.requestId,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    statusCode,
    errorType: err.constructor.name,
    errorCode: err.code,
    validation: err.validation,
    details: err.details,
  };

  // Log the error with appropriate level
  if (isServerError) {
    logger.error(`Server Error: ${err.message}`, {
      ...errorContext,
      stack: err.stack,
      ...(err.originalError && { originalError: err.originalError }),
    });
  } else if (isClientError) {
    logger.warn(`Client Error: ${err.message}`, {
      ...errorContext,
    });
  } else {
    logger.info(`Error: ${err.message}`, errorContext);
  }

  // Changed: create safe client-facing messages instead of exposing runtime errors
  let publicMessage;
  let publicCode;

  if (isMalformedJson) {
    statusCode = 400;
    publicMessage = 'Invalid JSON payload.';
    publicCode = 'INVALID_JSON';
  } else if (statusCode >= 500) {
    // Changed: hide internal server error details
    publicMessage = 'Internal Server Error';
    publicCode = 'INTERNAL_ERROR';
  } else {
    publicMessage = err.message || 'Request could not be processed.';
    publicCode = err.code || 'CLIENT_ERROR';
  }

  // Changed: removed stack trace and internal details from the client response
  return res.status(statusCode).json({
    success: false,
    error: {
      message: publicMessage,
      code: publicCode,
    },
    requestId: req.requestId,
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
  AppError,
};
