const mealPlanRepository = require('../repositories/mealPlanRepository');

async function insertRiskReport(report) {
  return mealPlanRepository.createRiskReport(report);
}

module.exports = { insertRiskReport };
