const mealPlanModel = require("../../model/mealPlan");

async function getMealPlansByUserId(userId) {
  return mealPlanModel.get(userId);
}

module.exports = {
  getMealPlansByUserId,
};
