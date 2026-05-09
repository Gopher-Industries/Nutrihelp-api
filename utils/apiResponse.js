/**
 * Standard API response builder.
 *
 * All endpoints should use these helpers so every response follows the same
 * contract:  { success, data, error, code, meta }
 *
 * Frontend and mobile consumers can rely on `success` as the single boolean
 * discriminator instead of inspecting HTTP status codes alone.
 */

/**
 * @typedef {Object} ApiMeta
 * @property {string}  [requestId]
 * @property {number}  [page]
 * @property {number}  [limit]
 * @property {number}  [total]
 * @property {string}  [contractVersion]
 */

/**
 * Build a successful response envelope.
 *
 * @param {Object} res          - Express response object
 * @param {*}      data         - Payload to return under `data`
 * @param {number} [status=200] - HTTP status code
 * @param {ApiMeta} [meta={}]   - Optional metadata (pagination, version, etc.)
 */
function ok(res, data = null, status = 200, meta = {}) {
  const body = { success: true, data };
  if (Object.keys(meta).length) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * Build an error response envelope.
 *
 * @param {Object} res           - Express response object
 * @param {string} message       - Human-readable error message
 * @param {number} [status=500]  - HTTP status code
 * @param {string} [code]        - Machine-readable error code, e.g. "AUTH_001"
 * @param {*}      [details]     - Optional extra details (only in non-production)
 */
function fail(res, message, status = 500, code = null, details = null) {
  const body = { success: false, error: message };
  if (code) body.code = code;
  if (details && process.env.NODE_ENV !== 'production') body.details = details;
  return res.status(status).json(body);
}

/**
 * Build a validation-error response.
 * Keeps the array of field errors under `errors` for express-validator compat.
 *
 * @param {Object}   res    - Express response object
 * @param {Array}    errors - Array of { field, message } objects
 */
function validationError(res, errors) {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    errors,
  });
}

/**
 * Wrap a service layer result that uses { statusCode, body } envelope
 * (chatbotService, medicalPredictionService pattern).
 *
 * @param {Object} res
 * @param {{ statusCode: number, body: Object }} serviceResult
 */
function fromService(res, serviceResult) {
  const { statusCode = 500, body = {} } = serviceResult;
  const success = statusCode >= 200 && statusCode < 300;
  return res.status(statusCode).json({ success, ...body });
}

module.exports = { ok, fail, validationError, fromService };
