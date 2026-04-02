const { medicalPredictionService } = require('../services/medicalPredictionService');
const { isServiceError } = require('../services/serviceError');

async function predict(req, res) {
  try {
    const result = await medicalPredictionService.predict(req.body || {});
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...(error.details || {})
      });
    }

    console.error('[predict] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { predict };
