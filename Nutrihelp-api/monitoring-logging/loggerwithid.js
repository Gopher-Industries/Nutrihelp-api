const logger = require('./appLogger');

function logWithId(req, level, message) {
  logger.log({
    level,
    message,
    requestId: req.id   // attaches the correlation ID from server.js
  });
}

module.exports = logWithId;