class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    Error.captureStackTrace?.(this, ServiceError);
  }
}

module.exports = { ServiceError };
