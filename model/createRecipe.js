const supabase = require('../dbConnection.js');

async function createRecipe(user_id, ingredient_id, ingredient_quantity,
    recipe_name, cuisine_id, total_servings, preparation_time, instructions) {

    recipe = {
        "user_id": user_id,
        "recipe_name": recipe_name,
        "cuisine_id": cuisine_id,
        "total_servings": total_servings,
        "preparation_time": preparation_time,
        "ingredients": {
            "id": ingredient_id,
            "quantity": ingredient_quantity
        }
    };

    let calories = 0;
    let fat = 0.0;
    let carbohydrates = 0.0;
    let protein = 0.0;
    let fiber = 0.0;
    let vitamin_a = 0.0;
    let vitamin_b = 0.0;
    let vitamin_c = 0.0;
    let vitamin_d = 0.0;
    let sodium = 0.0;
    let sugar = 0.0;

    try {
        let { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .in('id', ingredient_id)

        for (let i = 0; i < ingredient_id.length; i++) {
            for (let j = 0; j < data.length; j++) {
                if (data[j].id === ingredient_id[i]) {
                    calories = calories + data[j].calories / 100 * ingredient_quantity[i]
                    fat = fat + data[j].fat / 100 * ingredient_quantity[i]
                    carbohydrates = carbohydrates + data[j].carbohydrates / 100 * ingredient_quantity[i]
                    protein = protein + data[j].protein / 100 * ingredient_quantity[i]
                    fiber = fiber + data[j].fiber / 100 * ingredient_quantity[i]
                    vitamin_a = vitamin_a + data[j].vitamin_a / 100 * ingredient_quantity[i]
                    vitamin_b = vitamin_b + data[j].vitamin_b / 100 * ingredient_quantity[i]
                    vitamin_c = vitamin_c + data[j].vitamin_c / 100 * ingredient_quantity[i]
                    vitamin_d = vitamin_d + data[j].vitamin_d / 100 * ingredient_quantity[i]
                    sodium = sodium + data[j].sodium / 100 * ingredient_quantity[i]
                    sugar = sugar + data[j].sugar / 100 * ingredient_quantity[i]
                }
            }
        }

        recipe.instructions = instructions;
        recipe.calories = calories;
        recipe.fat = fat;
        recipe.carbohydrates = carbohydrates;
        recipe.protein = protein;
        recipe.fiber = fiber;
        recipe.vitamin_a = vitamin_a;
        recipe.vitamin_b = vitamin_b;
        recipe.vitamin_c = vitamin_c;
        recipe.vitamin_d = vitamin_d;
        recipe.sodium = sodium;
        recipe.sugar = sugar;

        return recipe

    } catch (error) {
        throw error;
    }

}

async function saveRecipe(recipe) {

    try {
        let { data, error } = await supabase
            .from('recipes')
            .insert(recipe)
            .select()
        return data

    } catch (error) {
        throw error;
    }
}

async function saveRecipeRelation(recipe, savedDataId) {

    try {
        insert_object = [];
        for (let i = 0; i < recipe.ingredients.id.length; i++) {
            insert_object.push({
                "ingredient_id": recipe.ingredients.id[i],
                "recipe_id": savedDataId,
                "user_id": recipe.user_id,
                "cuisine_id": recipe.cuisine_id
            })
        }
        let { data, error } = await supabase
            .from('recipe_ingredient')
            .insert(insert_object)
            .select()
            return data

    } catch (error) {
        throw error;
    }
}
module.exports = { createRecipe, saveRecipe, saveRecipeRelation };