const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function createMealPlan({ userId, recipeJson, mealType }) {
  try {
    const { data, error } = await supabase
      .from('meal_plan')
      .insert({ user_id: userId, recipes: recipeJson, meal_type: mealType })
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create meal plan', error, { userId });
  }
}

async function createRecipeMealRelations(relations) {
  try {
    const { data, error } = await supabase
      .from('recipe_meal')
      .insert(relations)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create recipe meal relations', error);
  }
}

async function getRecipeMealsByUserId(userId) {
  try {
    const query =
      'recipe_name,...cuisine_id(cuisine:name),total_servings,' +
      '...cooking_method_id(cooking_method:name),' +
      'preparation_time,calories,fat,carbohydrates,protein,fiber,' +
      'vitamin_a,vitamin_b,vitamin_c,vitamin_d,sodium,sugar,allergy,dislike';

    const { data, error } = await supabase
      .from('recipe_meal')
      .select(`...mealplan_id(id,meal_type),recipe_id,...recipe_id(${query})`)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load recipe meals by user', error, { userId });
  }
}

async function deleteMealPlanById(id, userId) {
  try {
    const { data, error } = await supabase
      .from('meal_plan')
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to delete meal plan', error, { id, userId });
  }
}

async function getMealPlanByUserIdAndDate(userId, createdAt) {
  try {
    let query = supabase.from('meal_plan').select('created_at, recipes, meal_type');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (createdAt) {
      const startOfDay = `${createdAt} 00:00:00`;
      const endOfDay = `${createdAt} 23:59:59`;
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load meal plans by user and date', error, { userId, createdAt });
  }
}

async function createHealthPlan(plan) {
  try {
    const { data, error } = await supabase
      .from('health_plan')
      .insert(plan)
      .select('id')
      .single();
    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create health plan', error);
  }
}

async function createWeeklyHealthPlans(weeklyPlans) {
  try {
    const { error } = await supabase
      .from('health_plan_weekly')
      .insert(weeklyPlans);
    if (error) throw error;
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to create weekly health plans', error);
  }
}

async function deleteHealthPlan(planId) {
  try {
    const { error } = await supabase
      .from('health_plan')
      .delete()
      .eq('id', planId);
    if (error) throw error;
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to delete health plan', error, { planId });
  }
}

async function createRiskReport(report) {
  try {
    const { data, error } = await supabase
      .from('health_risk_reports')
      .insert(report)
      .select('id')
      .single();
    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create risk report', error);
  }
}

async function createSurvey(survey) {
  try {
    const { data, error } = await supabase
      .from('health_surveys')
      .insert(survey)
      .select('id')
      .single();
    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create health survey', error);
  }
}

module.exports = {
  createHealthPlan,
  createMealPlan,
  createRecipeMealRelations,
  createRiskReport,
  createSurvey,
  createWeeklyHealthPlans,
  deleteHealthPlan,
  deleteMealPlanById,
  getMealPlanByUserIdAndDate,
  getRecipeMealsByUserId
};
