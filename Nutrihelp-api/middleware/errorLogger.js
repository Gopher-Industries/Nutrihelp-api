// middleware/errorLogger.js
const errorLogService = require('../services/errorLogService');

/**
 * Enhanced error logging middleware
 */
const errorLogger = (err, req, res, next) => {
  // Automatically categorize errors
  const classification = errorLogService.categorizeError(err, { req, res });

  // Log the error
  errorLogService.logError({
    error: err,
    req,
    res,
    category: classification.category,
    type: classification.type,
    additionalContext: {
      route: req.route?.path,
      middleware_stack: req.route?.stack?.map(s => s.handle.name),
      query_params: req.query,
      path_params: req.params
    }
  }).catch(loggingError => {
    console.error('Error in error logging middleware:', loggingError);
  });

  next(err);
};

/**
 * Request response time tracking middleware
 */
const responseTimeLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capture response end event
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    res.responseTime = responseTime;

    // Log slow requests
    if (responseTime > 5000) { 
      errorLogService.logError({
        error: new Error(`Slow request detected: ${responseTime}ms`),
        req,
        res,
        category: 'warning',
        type: 'performance',
        additionalContext: {
          response_time_ms: responseTime,
          slow_request: true
        }
      });
    }
  });
  
  next();
};

/**
 * Uncaught exception handler
 */
const uncaughtExceptionHandler = (error) => {
  errorLogService.logError({
    error,
    category: 'critical',
    type: 'system',
    additionalContext: {
      uncaught_exception: true,
      process_uptime: process.uptime()
    }
  });
  
  console.error('Uncaught Exception:', error);
  // Graceful shutdown
  process.exit(1);
};

/**
 * Unhandled Promise Rejection handler
 */
const unhandledRejectionHandler = (reason, promise) => {
  errorLogService.logError({
    error: new Error(`Unhandled Promise Rejection: ${reason}`),
    category: 'critical',
    type: 'system',
    additionalContext: {
      unhandled_rejection: true,
      promise_state: promise
    }
  });
  
  console.error('Unhandled Rejection:', reason);
};

module.exports = {
  errorLogger,
  responseTimeLogger,
  uncaughtExceptionHandler,
  unhandledRejectionHandler
};