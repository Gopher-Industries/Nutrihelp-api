'use strict';

/**
 * HTTP layer for the AI Health Assessment (FE-04).
 *
 * Responses use the standard NutriHelp envelope that the frontend API client
 * unwraps (src/api/client.js):
 *   success: { success: true, data, meta? }
 *   failure: { success: false, error: string, code: string, details? }
 */

const logger = require('../utils/logger');
const { isServiceError } = require('../services/serviceError');
const { validateSubmission } = require('../validators/healthAssessmentValidator');
const { createHealthAssessmentService } = require('../services/healthAssessmentService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(res, status, error, code, details) {
  const body = { success: false, error, code };
  if (details) body.details = details;
  return res.status(status).json(body);
}

function handleError(res, error, context) {
  if (isServiceError(error)) {
    const code = error.statusCode === 404 ? 'HEALTH_ASSESSMENT_NOT_FOUND' : 'HEALTH_ASSESSMENT_ERROR';
    return fail(res, error.statusCode, error.message, code, error.details || undefined);
  }
  logger.error(`Health assessment ${context} failed`, { reason: error.message });
  return fail(res, 500, 'Something went wrong while processing your assessment.', 'HEALTH_ASSESSMENT_INTERNAL');
}

function createHealthAssessmentController(deps = {}) {
  const service = deps.service || createHealthAssessmentService();
  // Required lazily: healthPlanController opens a database client on load.
  const getPlanGenerator = () =>
    deps.planGenerator || require('./healthPlanController').generateWeeklyPlan;

  const requireValidId = (req, res) => {
    if (!UUID_RE.test(String(req.params.id || ''))) {
      fail(res, 400, 'Invalid assessment id', 'HEALTH_ASSESSMENT_INVALID_ID');
      return false;
    }
    return true;
  };

  return {
    getQuestions(_req, res) {
      res.set('Cache-Control', 'public, max-age=300');
      return res.status(200).json({ success: true, data: service.getQuestionnaire() });
    },

    async submit(req, res) {
      const { value, errors } = validateSubmission(req.body);
      if (errors) {
        return fail(res, 400, 'Please check your answers and try again.', 'HEALTH_ASSESSMENT_VALIDATION', errors);
      }

      try {
        const data = await service.submit(req.user.userId, value);
        return res.status(data.persisted ? 201 : 200).json({ success: true, data });
      } catch (error) {
        return handleError(res, error, 'submit');
      }
    },

    async history(req, res) {
      try {
        const data = await service.history(req.user.userId, { limit: req.query.limit });
        return res.status(200).json({ success: true, data });
      } catch (error) {
        return handleError(res, error, 'history');
      }
    },

    async latest(req, res) {
      try {
        const data = await service.getLatest(req.user.userId);
        return res.status(200).json({ success: true, data });
      } catch (error) {
        return handleError(res, error, 'latest');
      }
    },

    async getById(req, res) {
      if (!requireValidId(req, res)) return undefined;
      try {
        const data = await service.getById(req.user.userId, req.params.id);
        return res.status(200).json({ success: true, data });
      } catch (error) {
        return handleError(res, error, 'getById');
      }
    },

    async remove(req, res) {
      if (!requireValidId(req, res)) return undefined;
      try {
        const data = await service.remove(req.user.userId, req.params.id);
        return res.status(200).json({ success: true, data });
      } catch (error) {
        return handleError(res, error, 'remove');
      }
    },

    /**
     * Generate a 4-week health plan from a saved assessment. Reuses the
     * existing weekly-plan controller (AI plan service with local fallback)
     * and wraps its output in the standard envelope.
     */
    async generatePlan(req, res) {
      if (!requireValidId(req, res)) return undefined;
      try {
        const assessment = await service.getById(req.user.userId, req.params.id);

        const captured = await new Promise((resolve, reject) => {
          const shim = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(body) { resolve({ statusCode: this.statusCode, body }); return this; },
          };
          Promise.resolve(getPlanGenerator()({ body: assessment.planRequest, user: req.user }, shim)).catch(reject);
        });

        if (captured.statusCode >= 400) {
          return fail(res, captured.statusCode, captured.body?.error || 'Could not generate a plan', 'HEALTH_PLAN_ERROR');
        }
        return res.status(200).json({ success: true, data: captured.body });
      } catch (error) {
        return handleError(res, error, 'generatePlan');
      }
    },
  };
}

module.exports = { createHealthAssessmentController };
