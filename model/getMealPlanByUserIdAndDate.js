const mealPlanRepository = require('../repositories/mealPlanRepository');
const recipeRepository = require('../repositories/recipeRepository');

async function getMealPlanByUserIdAndDate(user_id, created_at) {
    try {
        const mealPlans = await mealPlanRepository.getMealPlanByUserIdAndDate(user_id, created_at);

        if (!mealPlans || mealPlans.length === 0) {
            throw new Error('Meal plans not found or query error');
        }

        for (let mealPlan of mealPlans) {
            const recipeIds = mealPlan?.recipes?.recipe_ids;

            if (!recipeIds || recipeIds.length === 0) {
                mealPlan.recipes = [];
                continue;
            }

            const recipes = await recipeRepository.getRecipesByIds(recipeIds);

            mealPlan.recipes = recipes.map(recipe => recipe.recipe_name);
        }

        return mealPlans;
    } catch (error) {
        console.error('[getMealPlanByUserIdAndDate] Failed to fetch meal plans:', error.message);
        throw error;
    }
}

module.exports = getMealPlanByUserIdAndDate;
