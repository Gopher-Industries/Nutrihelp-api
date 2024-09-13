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
    query = 'recipe_name,...cuisine_id(cuisine:name),total_servings,' +
        '...cooking_method_id(cooking_method:name),' +
        'preparation_time,calories,fat,carbohydrates,protein,fiber,' +
        'vitamin_a,vitamin_b,vitamin_c,vitamin_d,sodium,sugar,allergy,dislike'
    try {
        let { data, error } = await supabase
            .from('recipe_meal')
            .select('...mealplan_id(id,meal_type),recipe_id,...recipe_id(' + query + ')')
            .eq('user_id', user_id)
        if (error) throw error;

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