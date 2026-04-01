const mealPlanRepository = require("../../repositories/mobile/mealPlanRepository");

async function getMealPlansByUserId(userId) {
  return mealPlanRepository.getMealPlansByUserId(userId);
}

module.exports = {
  getMealPlansByUserId,
};
