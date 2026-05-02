const logger = require('../utils/logger');

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

  next();
};
