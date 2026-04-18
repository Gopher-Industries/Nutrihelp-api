const { medicalPredictionService } = require('../services/medicalPredictionService');
const { isServiceError } = require('../services/serviceError');
const logger = require('../utils/logger');

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

    logger.error('Unexpected error in medical prediction', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { predict };