/**
 * controller/healthToolsController.js
 *
 * Endpoints:
 *   GET /api/health-tools         -> catalogue of available tools
 *   GET /api/health-tools/bmi     -> BMI + daily water intake estimate
 */

const support = require('../utils/supportResponse');
const logger = require('../utils/logger');
const toolsSeed = require('./supportData/healthToolsSeed');

/**
 * Catalogue endpoint. Returns the list of tools so the frontend
 * /health-tools page can render even if no other content is available.
 */
const listTools = async (req, res) => {
  try {
    const optionalCategory = (req.query.category || '').trim().toLowerCase();
    const tools = optionalCategory
      ? toolsSeed.filter((t) => t.category.toLowerCase() === optionalCategory)
      : toolsSeed;

    const categories = Array.from(new Set(toolsSeed.map((t) => t.category)));

    return support.sendSuccess(
      res,
      { tools, categories },
      { meta: { count: tools.length, generatedAt: new Date().toISOString() } }
    );
  } catch (error) {
    logger.error('healthToolsController.listTools failed', { error: error.message });
    return support.sendError(
      res,
      500,
      'Unable to load health tools right now.',
      'HEALTH_TOOLS_LIST_FAILED'
    );
  }
};

/**
 * BMI endpoint. Accepts height (m) and weight (kg) as query params.
 */
const getBmi = async (req, res) => {
  try {
    const height = Number(req.query.height);
    const weight = Number(req.query.weight);

    if (!height || !weight || height <= 0 || weight <= 0) {
      return support.sendError(
        res,
        400,
        'Invalid parameters. Height (m) and weight (kg) must be positive numbers.',
        'HEALTH_TOOLS_BMI_INVALID_INPUT'
      );
    }
    if (height > 3 || weight > 700) {
      return support.sendError(
        res,
        400,
        'Inputs out of reasonable range. Height should be in metres and weight in kilograms.',
        'HEALTH_TOOLS_BMI_INVALID_INPUT'
      );
    }

    const bmi = weight / (height * height);
    const recommendedWaterIntakeMl = Math.round(weight * 35);

    let category = 'Normal weight';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi >= 25 && bmi < 30) category = 'Overweight';
    else if (bmi >= 30) category = 'Obese';

    return support.sendSuccess(res, {
      bmi: Number(bmi.toFixed(2)),
      category,
      recommendedWaterIntakeMl,
      inputs: { height, weight },
    });
  } catch (error) {
    logger.error('healthToolsController.getBmi failed', { error: error.message });
    return support.sendError(
      res,
      500,
      'Unable to compute BMI right now.',
      'HEALTH_TOOLS_BMI_FAILED'
    );
  }
};

module.exports = {
  listTools,
  getBmi,
};
