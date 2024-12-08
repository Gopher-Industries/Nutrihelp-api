const supabase = require('../dbConnection.js');

async function getMealPlanByUserIdAndDate(user_id, created_at) {
    try {
        let query = supabase.from('meal_plan').select('created_at, recipes, meal_type');

        if (user_id) {
            query = query.eq('user_id', user_id);
        }

        if (created_at) {
            const startOfDay = `${created_at} 00:00:00`;
            const endOfDay = `${created_at} 23:59:59`;
            query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
        }

        let { data: mealPlans, error } = await query;

        if (error || !mealPlans || mealPlans.length === 0) {
            throw new Error('Meal plans not found or query error');
        }

        for (let mealPlan of mealPlans) {
            const recipeIds = mealPlan?.recipes?.recipe_ids;

            if (!recipeIds || recipeIds.length === 0) {
                mealPlan.recipes = [];
                continue;
            }

            const { data: recipes, error: recipesError } = await supabase
                .from('recipes')
                .select('recipe_name')
                .in('id', recipeIds);

            if (recipesError) {
                throw recipesError;
            }

            mealPlan.recipes = recipes.map(recipe => recipe.recipe_name);
        }

        return mealPlans;
    } catch (error) {
        console.error('Error fetching meal plans:', error.message);
        throw error;
    }
}

module.exports = getMealPlanByUserIdAndDate;
