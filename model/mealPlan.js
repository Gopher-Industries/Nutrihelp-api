const mealPlanRepository = require('../repositories/mealPlanRepository');
const recipeRepository = require('../repositories/recipeRepository');
let { getUserRecipes } = require('../model/getUserRecipes.js');


async function add(userId, recipe_json, meal_type) {
    try {
        return await mealPlanRepository.createMealPlan({ userId, recipeJson: recipe_json, mealType: meal_type });
    } catch (error) {
        console.error('[mealPlanModel] Failed to create meal plan:', error);
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
        return await mealPlanRepository.createRecipeMealRelations(insert_object);
    } catch (error) {
        throw error;
    }
}

async function get(user_id) {
    query = 'recipe_name,...cuisine_id(cuisine:name),total_servings,' +
        '...cooking_method_id(cooking_method:name),' +
        'preparation_time,calories,fat,carbohydrates,protein,fiber,' +
        'vitamin_a,vitamin_b,vitamin_c,vitamin_d,sodium,sugar,allergy,dislike'
    try {
        let data = await mealPlanRepository.getRecipeMealsByUserId(user_id);

        if (!data || !data.length) return null;

        let output = [];
        let added = [];
        for (let i = 0; i < data.length; i++) {
            if (added.includes(data[i]['id'])) {
                for (let j = 0; j < output.length; j++) {
                    if (output[j]['id'] == data[i]['id']) {
                        delete data[i]['id']
                        delete data[i]['meal_type']
                        output[j]['recipes'].push(data[i])
                    }
                }
            }
            else {
                let mealplan = {}
                mealplan['recipes'] = [];
                mealplan['id'] = data[i]['id']
                mealplan['meal_type'] = data[i]['meal_type']
                added.push(data[i]['id'])
                delete data[i]['id']
                delete data[i]['meal_type']
                mealplan['recipes'].push(data[i])
                output.push(mealplan)
            }
        }
        return output;

    } catch (error) {
        console.error('[mealPlanModel] Failed to fetch meal plans:', error);
        throw error;
    }
}
async function deletePlan(id, user_id) {
    try {
        return await mealPlanRepository.deleteMealPlanById(id, user_id);
    } catch (error) {
        console.error('[mealPlanModel] Failed to delete meal plan:', error);
        throw error;
    }
}

module.exports = { add, get, deletePlan, saveMealRelation };
