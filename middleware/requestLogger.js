/**
 * middleware/requestLogger.js
 * 
 * Structured request logging middleware
 * Logs all incoming requests and responses
 */

const logger = require('../utils/logger');

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Main request logging middleware
 */
const requestLoggingMiddleware = (req, res, next) => {
  // Generate and attach request ID
  const requestId = req.headers['x-request-id'] || generateRequestId();
  req.id = requestId;
  
  // Track request start time
  const startTime = Date.now();

  // Extract useful request info
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Log incoming request
  logger.info(`→ ${method} ${path}`, {
    requestId,
    method,
    path,
    ip,
    userAgent,
    ...(req.user ? { userId: req.user.id } : {}),
    query: Object.keys(req.query).length > 0 ? req.query : undefined
  });

  // Capture response details
  const originalSend = res.send;
  res.send = function(data) {
    // Calculate duration
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determine log level based on status code
    let logLevel = 'info';
    if (statusCode >= 500) logLevel = 'error';
    else if (statusCode >= 400) logLevel = 'warn';
    else if (duration > 5000) logLevel = 'warn'; // Slow request

    // Log response
    const logMessage = `← ${method} ${path} ${statusCode} (${duration}ms)`;
    
    logger[logLevel](logMessage, {
      requestId,
      method,
      path,
      statusCode,
      duration,
      ...(req.user ? { userId: req.user.id } : {}),
      contentLength: res.get('content-length'),
      ...(logLevel === 'error' ? { responseBody: data } : {})
    });

    // Call original send
    return originalSend.call(this, data);
  };

  // Attach logger to request for use in controllers
  req.logger = logger;
  req.requestId = requestId;

  next();
};

module.exports = { requestLoggingMiddleware, generateRequestId };
