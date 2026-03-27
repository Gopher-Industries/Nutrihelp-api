const mealPlanRepository = require('../repositories/mealPlanRepository');

async function insertSurvey(survey) {
  return mealPlanRepository.createSurvey(survey);
}

module.exports = { insertSurvey };
