const DailyRotateFile = require('winston-daily-rotate-file');
const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  // Different log levels for dev vs production
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  format: format.combine(
    // Colored logs only in development
    format.colorize({ all: process.env.NODE_ENV !== 'production' }),

    // Timestamp for all logs
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

    // Custom log format
    format.printf(({ timestamp, level, message, requestId }) => {
      return `${timestamp} [${level.toUpperCase()}]${requestId ? ` [ID: ${requestId}]` : ''}: ${message}`;
    })
  ),

  transports: [
    // Console output
    new transports.Console(),

    // Error logs
    new transports.File({
      filename: path.join(__dirname, '..', 'logs', 'error.log'),
      level: 'error',
    }),

    // Combined logs
    new transports.File({
      filename: path.join(__dirname, '..', 'logs', 'combined.log'),
    }),

    // JSON logs for ELK / Grafana Loki
    new transports.File({
      filename: path.join(__dirname, '..', 'logs', 'json.log'),
      format: format.json(),
    }),

    // Daily rotating logs
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
    })
  ],
});

module.exports = logger;