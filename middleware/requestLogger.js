const logger = require('../utils/logger');
const { recordRequest } = require('../services/requestAuditService');

module.exports = (req, res, next) => {
  const start = Date.now();

  // Log request entry
  logger.info(`→ ${req.method} ${req.originalUrl}`, {
    query: req.query,
    body: req.body
  });

  // Hook into response finish to log exit
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(`← ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
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

    recordRequest({
      method,
      path,
      statusCode,
      duration,
      requestId,
      userId: req.user?.userId || null,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  // Attach logger to request for use in controllers
  req.logger = logger;
  req.requestId = requestId;

  next();
};
