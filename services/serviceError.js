/**
 * services/serviceError.js
 * Adapter that exports the canonical ServiceError used by tests and app code.
 * It imports the utils implementation so there's a single constructor identity.
 */
const ServiceError = require('../utils/ServiceError');

function isServiceError(error) {
  return error instanceof ServiceError;
}

module.exports = {
  ServiceError,
  isServiceError
};
