const supabase = require('../dbConnection.js');

async function createRecipe(user_id, ingredient_id, ingredient_quantity,
    recipe_name, cuisine, total_servings, preparation_time, instuctions) {

    recipe = {
        "user_id": user_id,
        "recipe_name": recipe_name,
        "cuisine": cuisine,
        "total_servings": total_servings,
        "preparation_time": preparation_time,
        "ingredient_id":ingredient_id,
        "ingredient_quantity": ingredient_quantity,
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
    let ingredient_category = [];
    let ingredient_name = [];

    try {
        let { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .in('id', ingredient_id)

        for (let i = 0; i < ingredient_id.length; i++) {
            for (let j = 0; j < data.length; j++) {
                if (data[j].id === ingredient_id[i]) {
                    ingredient_name.push(data[j].ingredient_name)
                    ingredient_category.push(data[j].ingredient_category)
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

        recipe.ingredient_name = ingredient_name;
        recipe.ingredient_category = ingredient_category;
        recipe.instuctions = instuctions;
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

        console.log(recipe)

        return recipe

    } catch (error) {
        throw error;
    }

}

module.exports = createRecipe;