const { coreApp, shared } = require('../services');

const { recommendationService } = coreApp;
const { createErrorResponse } = shared.apiResponse;

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function validateRecommendationRequest(body = {}) {
  if (!isPlainObject(body.dietaryConstraints)) {
    throw validationError('dietaryConstraints is required and must be an object');
  }

  if (body.aiInsights != null && !isPlainObject(body.aiInsights)) {
    throw validationError('aiInsights must be an object when provided');
  }

  if (body.aiAdapterInput != null && !isPlainObject(body.aiAdapterInput)) {
    throw validationError('aiAdapterInput must be an object when provided');
  }

  if (body.healthGoals != null && !isPlainObject(body.healthGoals) && !Array.isArray(body.healthGoals)) {
    throw validationError('healthGoals must be an object or array when provided');
  }

  if (body.maxResults != null && (!Number.isInteger(body.maxResults) || body.maxResults < 1 || body.maxResults > 20)) {
    throw validationError('maxResults must be an integer between 1 and 20');
  }
}

async function getRecommendations(req, res) {
  try {
    validateRecommendationRequest(req.body || {});

    const result = await recommendationService.generateRecommendations({
      userId: req.user?.userId || req.body?.userId,
      email: req.user?.email || req.body?.email,
      healthGoals: req.body?.healthGoals || {},
      dietaryConstraints: req.body?.dietaryConstraints || {},
      aiInsights: req.body?.aiInsights || null,
      medicalReport: req.body?.medicalReport || null,
      aiAdapterInput: req.body?.aiAdapterInput || null,
      maxResults: req.body?.maxResults,
      refreshCache: req.body?.refreshCache === true
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[recommendationController] error:', error);
    const statusCode = error.statusCode || 500;
    const clientMessage = statusCode >= 500
      ? 'Failed to generate recommendations'
      : (error.message || 'Invalid recommendation request');

    return res.status(statusCode).json(createErrorResponse(
      clientMessage,
      statusCode >= 500 ? 'RECOMMENDATION_FAILED' : 'VALIDATION_ERROR'
    ));
  }
}

module.exports = {
  getRecommendations
};
