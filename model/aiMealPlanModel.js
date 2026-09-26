const supabase = require('../dbConnection.js');

async function saveMealPlan({ userId, filters, plan, aiModelUsed }) {
  const { data, error } = await supabase
    .from('ai_meal_plans')
    .insert({
      user_id: userId || null,
      filters,
      plan,
      ai_model_used: aiModelUsed,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function saveFeedback({ mealPlanId, rating, likedMeals, dislikedMeals, followedPlan, notes }) {
  const { data, error } = await supabase
    .from('ai_meal_plan_feedback')
    .insert({
      meal_plan_id: mealPlanId,
      rating,
      liked_meals: likedMeals || [],
      disliked_meals: dislikedMeals || [],
      followed_plan: followedPlan || false,
      notes: notes || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function getPlanById(planId) {
  const { data, error } = await supabase
    .from('ai_meal_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data;
}

module.exports = { saveMealPlan, saveFeedback, getPlanById };
