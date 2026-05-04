const logger = require('../utils/logger');
const { recordRequest } = require('../services/requestAuditService');
const { v4: uuidv4 } = require('uuid');

module.exports = (req, res, next) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  const method = req.method;
  const path = req.originalUrl;

  req.requestId = requestId;
  req.logger = logger;

  logger.info(`→ ${method} ${path}`, { query: req.query });

  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    let logLevel = 'info';
    if (statusCode >= 500) logLevel = 'error';
    else if (statusCode >= 400) logLevel = 'warn';
    else if (duration > 5000) logLevel = 'warn';

    logger[logLevel](`← ${method} ${path} ${statusCode} ${duration}ms`, {
      requestId,
      method,
      path,
      statusCode,
      duration,
      ...(req.user ? { userId: req.user.id } : {}),
      contentLength: res.get('content-length'),
      ...(logLevel === 'error' ? { responseBody: data } : {}),
    });

    recordRequest({
      method,
      path,
      statusCode,
      duration,
      requestId,
      userId: req.user?.userId || null,
    });

    return originalSend.call(this, data);
  };

  next();
};
