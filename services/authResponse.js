/**
 * services/authResponse.js
 *
 * Canonical response/error envelope for the authentication lifecycle:
 *   login, MFA verify, resend MFA, forgot password, verify reset code,
 *   reset password, refresh token, logout, change password.
 *
 * Every auth controller MUST emit responses through this module so that
 * web and mobile clients can integrate against a single, stable contract.
 *
 * Wire format
 * -----------
 * Success: { success: true,  data: <object|null>, meta?: <object> }
 * Error:   { success: false, error: { message: <string>, code: <string>, details?: <object> } }
 *
 * Validation errors are a special case of the error envelope and always carry
 * the AUTH_VALIDATION_ERROR code with a `details.fields` array.
 *
 * The shape mirrors `services/apiResponseService.js` so any controller that is
 * already using that helper continues to work unchanged.
 */

const {
  createSuccessResponse,
  createErrorResponse,
} = require('./apiResponseService');
const { isServiceError } = require('./serviceError');
const { AUTH_ERROR_CODES, statusForAuthCode } = require('./authErrorCodes');

/**
 * Send a canonical success response.
 *
 * @param {import('express').Response} res
 * @param {*} data    Payload returned under `data` (object or null).
 * @param {object} [opts]
 * @param {number} [opts.status=200]
 * @param {string} [opts.message]   Optional message attached to `meta.message`.
 * @param {object} [opts.meta]      Additional meta fields.
 */
function authOk(res, data = null, opts = {}) {
  const { status = 200, message, meta } = opts;
  const finalMeta = { ...(meta || {}) };
  if (message) finalMeta.message = message;
  const body = createSuccessResponse(
    data,
    Object.keys(finalMeta).length ? finalMeta : undefined
  );
  return res.status(status).json(body);
}

/**
 * Send a canonical error response.
 *
 * @param {import('express').Response} res
 * @param {object} opts
 * @param {string} opts.message     Human-readable error.
 * @param {string} opts.code        Machine-readable code from AUTH_ERROR_CODES.
 * @param {number} [opts.status]    HTTP status; falls back to statusForAuthCode(code).
 * @param {object} [opts.details]   Extra context (omitted in production).
 */
function authFail(res, { message, code, status, details } = {}) {
  const finalCode = code || AUTH_ERROR_CODES.INTERNAL_ERROR;
  const finalStatus = status || statusForAuthCode(finalCode) || 500;
  const safeDetails =
    details && process.env.NODE_ENV !== 'production' ? details : undefined;
  const body = createErrorResponse(
    message || 'An unexpected error occurred',
    finalCode,
    safeDetails
  );
  return res.status(finalStatus).json(body);
}

/**
 * Map an express-validator error array onto the canonical envelope.
 *
 * @param {import('express').Response} res
 * @param {Array<{path?: string, param?: string, msg?: string, message?: string}>} errors
 */
function authValidationError(res, errors = []) {
  const fields = (errors || []).map((err) => ({
    field: err.path || err.param || 'unknown',
    message: err.msg || err.message || 'Invalid value',
  }));
  return authFail(res, {
    message: 'Validation failed',
    code: AUTH_ERROR_CODES.VALIDATION_ERROR,
    status: 400,
    details: { fields },
  });
}

/**
 * Translate a thrown error into the canonical envelope. Use this from a
 * controller-level catch block so service-layer ServiceError instances flow
 * through with their statusCode + message intact, while unexpected errors
 * fall back to a safe 500 with the supplied fallback code.
 *
 * @param {import('express').Response} res
 * @param {Error} error
 * @param {object} [fallback]
 * @param {string} [fallback.code]
 * @param {number} [fallback.status]
 * @param {string} [fallback.message]
 */
function authFailFromError(res, error, fallback = {}) {
  if (isServiceError(error)) {
    return authFail(res, {
      message: error.message,
      code: fallback.code || AUTH_ERROR_CODES.INTERNAL_ERROR,
      status: error.statusCode,
      details: error.details || undefined,
    });
  }

  return authFail(res, {
    message: fallback.message || error?.message || 'Internal server error',
    code: fallback.code || AUTH_ERROR_CODES.INTERNAL_ERROR,
    status: fallback.status || 500,
    details: error?.stack ? { stack: error.stack } : undefined,
  });
}

module.exports = {
  authOk,
  authFail,
  authValidationError,
  authFailFromError,
  AUTH_ERROR_CODES,
};
