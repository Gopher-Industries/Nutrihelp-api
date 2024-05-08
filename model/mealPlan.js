const supabase = require('../dbConnection.js');


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
             return data;
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