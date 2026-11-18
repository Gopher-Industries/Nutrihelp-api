'use strict';

/**
 * HTTP layer for the AI Assessment Prediction Contract (FE-06).
 * Uses the shared response helpers, so every body is
 *   { success: true, data, meta } or { success: false, error, code, errors? }.
 */

const logger = require('../utils/logger');
const { ok, fail, validationError } = require('../utils/apiResponse');
const {
  CONTRACT_VERSION,
  ENDPOINTS,
  ENUMS,
  ERROR_CODES,
  INPUT_FIELDS,
  DISCLAIMER,
} = require('../contracts/ai-assessment/v1');
const { validateRequest } = require('../services/aiAssessment/schemas');
const { readThresholds } = require('../services/aiAssessment/normaliser');
const { createGateway } = require('../services/aiAssessment/gateway');

const META = Object.freeze({ contractVersion: CONTRACT_VERSION });

function createAiAssessmentController(deps = {}) {
  const gateway = deps.gateway || createGateway();

  return {
    /** Public: lets each client confirm it speaks the same contract version. */
    getContract(_req, res) {
      const thresholds = readThresholds();
      res.set('Cache-Control', 'public, max-age=300');
      return ok(
        res,
        {
          contractVersion: CONTRACT_VERSION,
          supportedVersions: [CONTRACT_VERSION],
          endpoints: ENDPOINTS,
          inputFields: INPUT_FIELDS,
          enums: ENUMS,
          errorCodes: Object.values(ERROR_CODES),
          thresholds: {
            confidence: thresholds.confidence,
            diabetesRisk: { moderate: thresholds.diabetesModerate, high: thresholds.diabetesHigh },
          },
          disclaimer: DISCLAIMER,
        },
        200,
        META
      );
    },

    async predict(req, res) {
      const requested = req.body?.contractVersion || req.get('X-Contract-Version');
      if (requested && requested !== CONTRACT_VERSION) {
        return fail(
          res,
          `Contract version ${String(requested).slice(0, 20)} is not supported. Supported: ${CONTRACT_VERSION}.`,
          400,
          ERROR_CODES.CONTRACT_VERSION_UNSUPPORTED
        );
      }

      const { value, errors } = validateRequest(req.body);
      if (errors) return validationError(res, errors);

      try {
        // The user id comes from the verified token only, and is used for
        // monitoring; it is never sent to the AI model.
        const data = await gateway.predict(value.inputs, { userId: req.user?.userId });
        return ok(res, data, 200, META);
      } catch (error) {
        logger.error('AI assessment prediction failed', { reason: error.message });
        return fail(res, 'Something went wrong while running the AI check.', 500, ERROR_CODES.INTERNAL_ERROR);
      }
    },
  };
}

module.exports = { createAiAssessmentController };
