/**
 * Response contract validation middleware.
 *
 * Intercepts res.json() calls and validates that every response follows the
 * standard { success: boolean, data|error } envelope.  In production it only
 * logs violations — it never blocks a response.  In development/test it adds
 * an `_contractWarnings` field so frontend devs can see violations immediately.
 *
 * Attach AFTER route registration:
 *   app.use(responseContractMiddleware);
 */

const logger = require('../utils/logger');

const REQUIRED_FIELD = 'success';

/**
 * Routes whose response shape is intentionally non-standard and should be
 * skipped (e.g. Swagger UI, metrics, static files).
 */
const SKIP_PATHS = [
  /^\/api-docs/,
  /^\/api\/metrics/,
  /^\/uploads\//,
  /^\/$/,
];

function shouldSkip(path) {
  return SKIP_PATHS.some((pattern) => pattern.test(path));
}

function responseContractMiddleware(req, res, next) {
  if (shouldSkip(req.path)) return next();

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const warnings = [];

    if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
      if (!(REQUIRED_FIELD in body)) {
        warnings.push(`Response missing required field: "${REQUIRED_FIELD}"`);
      }

      if (body.success === true && body.data === undefined && body.message === undefined) {
        warnings.push('Successful response should include "data" or "message" field');
      }

      if (body.success === false && !body.error && !body.errors) {
        warnings.push('Error response missing "error" or "errors" field');
      }
    }

    if (warnings.length) {
      logger.warn('API contract violation', {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        warnings,
      });

      if (process.env.NODE_ENV !== 'production' && typeof body === 'object') {
        body._contractWarnings = warnings;
      }
    }

    return originalJson(body);
  };

  next();
}

module.exports = responseContractMiddleware;
