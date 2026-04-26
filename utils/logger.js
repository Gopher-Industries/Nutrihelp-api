/**
 * utils/logger.js
 * 
 * Centralized structured logging using Winston
 * 
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('User logged in', { userId: 123, email: 'user@example.com' });
 *   logger.error('Database error', { error: err, query: sql });
 *   logger.warn('Rate limit approaching', { userId: 123, limit: 1000 });
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom format for structured logging
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  // Custom printf for console (more readable)
  winston.format.printf(({ timestamp, level, message, requestId, userId, ...meta }) => {
    let baseLog = `${timestamp} [${level.toUpperCase()}]`;
    
    if (requestId) baseLog += ` [REQ:${requestId}]`;
    if (userId) baseLog += ` [USER:${userId}]`;
    
    baseLog += ` ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Filter out the symbol used by winston
      const cleanMeta = Object.fromEntries(
        Object.entries(meta).filter(([key]) => !key.startsWith('Symbol'))
      );
      if (Object.keys(cleanMeta).length > 0) {
        baseLog += ` ${JSON.stringify(cleanMeta)}`;
      }
    }
    
    return baseLog;
  })
);

/**
 * Create logger with Winston
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: customFormat,
  defaultMeta: {
    service: 'nutrihelp-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console output (always)
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, requestId, userId, ...meta }) => {
          let output = `${timestamp} ${level} `;
          if (requestId) output += `(${requestId}) `;
          if (userId) output += `[${userId}] `;
          output += message;
          
          if (Object.keys(meta).length > 0) {
            const cleanMeta = Object.fromEntries(
              Object.entries(meta).filter(([key]) => !key.startsWith('Symbol'))
            );
            if (Object.keys(cleanMeta).length > 0) {
              output += ` ${JSON.stringify(cleanMeta, null, 2)}`;
            }
          }
          return output;
        })
      )
    }),

    // File logging - all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.json()
    }),

    // File logging - errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 10,
      format: winston.format.json()
    }),

    // File logging - requests (if in production)
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'requests.log'),
        maxsize: 10485760,
        maxFiles: 5,
        format: winston.format.json()
      })
    ] : [])
  ]
});

/**
 * Log levels:
 * error (0): Something failed
 * warn (1):  Something concerning but not fatal
 * info (2):  General information
 * http (3): HTTP requests/responses
 * debug (4): Detailed debugging information
 */

/**
 * Helper to create error log with standard format
 */
logger.logError = (message, error, context = {}) => {
  logger.error(message, {
    error: {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    },
    ...context
  });
};

/**
 * Helper to create HTTP log with standard format
 */
logger.logHttpRequest = (method, path, statusCode, duration, context = {}) => {
  logger.info(`${method} ${path} - ${statusCode}`, {
    http: {
      method,
      path,
      statusCode,
      duration: `${duration}ms`
    },
    ...context
  });
};

/**
 * Helper for database operations
 */
logger.logDB = (operation, table, context = {}) => {
  logger.debug(`DB: ${operation} on ${table}`, context);
};

module.exports = logger;
