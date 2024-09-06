const supabase = require('../dbConnection.js');
let {getUserRecipes} =  require('../model/getUserRecipes.js');


async function add(userId, recipe_json, meal_type ) {
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

async function get(id, user_id) {
    query = 'recipe_name,...cuisine_id(cuisine:name),total_servings,'+
            '...cooking_method_id(cooking_method:name),' +
            'preparation_time,calories,fat,carbohydrates,protein,fiber,' +
            'vitamin_a,vitamin_b,vitamin_c,vitamin_d,sodium,sugar,allergy,dislike'
    try {
        let { data, error } = await supabase
            .from('recipe_meal')
            .select('...mealplan_id(meal_type),recipe_id,...recipe_id(' +query+ ')')
            .eq('user_id', user_id)
            .eq('mealplan_id', id);
        if (error) throw error;
            
        if (!data || !data.length) return null;
        
        return { id: id, meal_type: data[0].meal_type, recipes: data };

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

module.exports = {add, get, deletePlan, saveMealRelation};