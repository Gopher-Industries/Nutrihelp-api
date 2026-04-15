class ServiceError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function isServiceError(error) {
  return error instanceof ServiceError;
}

module.exports = {
  ServiceError,
  isServiceError
};
