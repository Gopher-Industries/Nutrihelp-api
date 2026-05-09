/**
 * utils/supportResponse.js
 *
 * Thin convenience layer over services/apiResponseService for support-related
 * endpoints (contact-us, feedback, chatbot, FAQ, health-tools). Keeps the
 * envelope shape consistent across the support surface without forking the
 * shared response format.
 *
 *   sendSuccess(res, data, opts?)
 *     -> 200 { success: true, data, meta? }
 *
 *   sendCreated(res, data, opts?)
 *     -> 201 { success: true, data, meta? }
 *
 *   sendError(res, status, message, code?, details?)
 *     -> status { success: false, error: { message, code?, details? } }
 *
 *   sendValidationError(res, errors)
 *     -> 400 { success: false, error: { message, code: 'VALIDATION_ERROR',
 *                                       details: { fields: [...] } } }
 *
 * Designed to be safe to import from any controller: no side effects, no DB.
 */

const { shared } = require('../services');

const { createSuccessResponse, createErrorResponse } = shared.apiResponse;

const DEFAULT_VALIDATION_CODE = 'VALIDATION_ERROR';

function sendSuccess(res, data, opts = {}) {
  const { status = 200, meta } = opts;
  return res.status(status).json(createSuccessResponse(data, meta));
}

function sendCreated(res, data, opts = {}) {
  return sendSuccess(res, data, { ...opts, status: 201 });
}

function sendError(res, status, message, code, details) {
  return res.status(status).json(createErrorResponse(message, code, details));
}

function sendValidationError(res, errors) {
  const fields = (errors || []).map((e) => ({
    field: e.path || e.param || e.field || null,
    message: e.msg || e.message || 'Invalid value',
  }));

  return sendError(res, 400, 'Invalid request payload', DEFAULT_VALIDATION_CODE, {
    fields,
  });
}

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendValidationError,
};
