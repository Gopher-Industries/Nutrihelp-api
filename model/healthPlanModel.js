// models/healthPlanModel.js
const supabase = require("../dbConnection.js");

async function insertHealthPlan(plan) {
  const { data, error } = await supabase
    .from("health_plan")
    .insert(plan)
    .select("id")
    .single();

  if (error) throw error;
  return data; // returns { id: ... }
}

async function insertWeeklyPlans(weeklyPlans) {
  const { error } = await supabase
    .from("health_plan_weekly")
    .insert(weeklyPlans);

  if (error) throw error;
  return true;
}

async function deleteHealthPlan(planId) {
  const { error } = await supabase
    .from("health_plan")
    .delete()
    .eq("id", planId);

  if (error) throw error;
  return true;
}

module.exports = {
  insertHealthPlan,
  insertWeeklyPlans,
  deleteHealthPlan,
};
