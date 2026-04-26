class ServiceError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.status = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, ServiceError);
  }
}

function isServiceError(error) {
  return error instanceof ServiceError;
}

module.exports = {
  ServiceError,
  isServiceError
};
