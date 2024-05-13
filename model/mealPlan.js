const supabase = require('../dbConnection.js');
let {getUserRecipes} =  require('../model/getUserRecipes.js');


async function add(userId, recipe_json, meal_type ) {
    try {
        let { data, error } = await supabase
            .from('meal_plan')
            .insert({ user_id: userId, recipes: recipe_json, meal_type: meal_type });
        return data
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function get(id, user_id) {
    try {
        let { data, error } = await supabase
            .from('meal_plan')
            .select('id, created_at, user_id, recipes, meal_type')
            .eq('user_id', user_id)
            .eq('id', id);
            
        if (!data || !data.length) return null;
        const plan = data[0];

        if (!plan.recipes || !plan.recipes.recipe_ids || plan.recipes.recipe_ids.length === 0) return null;
      
        let recipes = await getUserRecipes(plan.recipes.recipe_ids);
       
        const extractedRecipes = recipes.map(recipe => {
            const { id, recipe_name, calories,protein, fat, carbohydrates, sodium } = recipe;
            const vitamins = recipe.vitamin_a + recipe.vitamin_b + recipe.vitamin_c + recipe.vitamin_d;
            return {
                id,
                name: recipe_name,
                details: {
                    calories,
                    fats: fat,
                    proteins: protein,
                    vitamins,
                    sodium
                }
            }
        });
        
        return { id: plan.id, meal_type: plan.meal_type, recipes: extractedRecipes };

    } catch (error) {
        console.log(error);
        throw error;
    }
}
async function deletePlan(id, user_id) {
    try {
         let { data, error } = await supabase
            .from('meal_plan')
            .delete()
             .eq('user_id', user_id)
             .eq('id', id);
             return data;
        return data
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports = {add, get, deletePlan};