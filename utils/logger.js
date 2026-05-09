let logger;
try {
  const winston = require('winston');
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [ new winston.transports.Console({ format: winston.format.simple() }) ]
  });
} catch (e) {
  logger = {
    info: (...args) => console.log('[info]', ...args),
    warn: (...args) => console.warn('[warn]', ...args),
    error: (...args) => console.error('[error]', ...args),
    debug: (...args) => console.debug('[debug]', ...args)
  };
}
module.exports = logger;
