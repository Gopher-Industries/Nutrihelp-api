const supabase = require('../dbConnection.js');
let { getUserRecipes } = require('../model/getUserRecipes.js');


async function add(userId, recipe_json, meal_type) {
    try {
        let { data, error } = await supabase
            .from('meal_plan')
            .insert({ user_id: userId, recipes: recipe_json, meal_type: meal_type })
            .select()
        return data
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function saveMealRelation(user_id, plan, savedDataId) {
    try {
        let recipes = await getUserRecipes(plan);
        insert_object = [];
        for (let i = 0; i < plan.length; i++) {
            insert_object.push({
                mealplan_id: savedDataId,
                recipe_id: plan[i],
                user_id: user_id,
                cuisine_id: recipes[i].cuisine_id,
                cooking_method_id: recipes[i].cooking_method_id
            });
        }
        let { data, error } = await supabase
            .from("recipe_meal")
            .insert(insert_object)
            .select();
        return data;
    } catch (error) {
        throw error;
    }
}

async function get(user_id) {
    const recipeQuery = 'id,recipe_name,description,ingredients,image_id,total_servings,' +
        '...cuisine_id(cuisine:name),' +
        '...cooking_method_id(cooking_method:name),' +
        'preparation_time,calories,fat,carbohydrates,protein,fiber,' +
        'vitamin_a,vitamin_b,vitamin_c,vitamin_d,sodium,sugar,allergy,dislike'
    try {
        let query = supabase
            .from('recipe_meal')
            .select('mealplan_id(id,meal_type,created_at),recipe_id,' + recipeQuery)
            .eq('user_id', user_id);

        let { data, error } = await query;
        if (error) throw error;

        if (!data || !data.length) return null;

        const plansById = new Map();

        for (const row of data) {
            const plan = row.mealplan_id || {};
            if (!plan.id) {
                continue;
            }

            if (!plansById.has(plan.id)) {
                plansById.set(plan.id, {
                    id: plan.id,
                    meal_type: plan.meal_type || null,
                    created_at: plan.created_at || null,
                    recipes: []
                });
            }

            plansById.get(plan.id).recipes.push({
                recipe_id: row.recipe_id
            });
        }

        return Array.from(plansById.values()).sort((a, b) => {
            const left = a.created_at ? new Date(a.created_at).getTime() : 0;
            const right = b.created_at ? new Date(b.created_at).getTime() : 0;
            return right - left;
        });

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
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports = { add, get, deletePlan, saveMealRelation };
