/**
 * utils/ServiceError.js
 * ServiceError class exported in multiple forms to satisfy different import styles in tests.
 */
class ServiceError extends Error {
  constructor(statusCode = 500, message = 'Service Error', details = null) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace && Error.captureStackTrace(this, ServiceError);
  }
}

// Export multiple shapes so tests using different import styles succeed.
module.exports = ServiceError;
module.exports.ServiceError = ServiceError;
module.exports.default = ServiceError;
Object.defineProperty(module.exports, '__esModule', { value: true });
