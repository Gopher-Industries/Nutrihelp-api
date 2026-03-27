const mealPlanRepository = require('../repositories/mealPlanRepository');

async function insertHealthPlan(plan) {
  return mealPlanRepository.createHealthPlan(plan);
}

async function insertWeeklyPlans(weeklyPlans) {
  return mealPlanRepository.createWeeklyHealthPlans(weeklyPlans);
}

async function deleteHealthPlan(planId) {
  return mealPlanRepository.deleteHealthPlan(planId);
}

module.exports = {
  insertHealthPlan,
  insertWeeklyPlans,
  deleteHealthPlan,
};
