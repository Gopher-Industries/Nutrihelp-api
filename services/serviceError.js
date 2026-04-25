class ServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

module.exports = {
  ServiceError,
};
