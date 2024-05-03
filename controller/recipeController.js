let createRecipe = require('../model/createRecipe.js');
let getUserRecipes = require('../model/getUserRecipes.js');

const createAndSaveRecipe = async (req, res) => {
    const { user_id, ingredient_id, ingredient_quantity,
        recipe_name, cuisine_id, total_servings, preparation_time, instuctions } = req.body;

    try {
        if (!user_id || !ingredient_id || !ingredient_quantity ||
            !recipe_name || !cuisine_id || !total_servings || !preparation_time || !instuctions) {
            return res.status(400).json({ error: 'Recipe parameters are missed', statusCode: 400 });
        }

        const recipe = await createRecipe.createRecipe(user_id, ingredient_id, ingredient_quantity,
            recipe_name, cuisine_id, total_servings, preparation_time, instuctions);

        let savedData = await createRecipe.saveRecipe(recipe);
        await createRecipe.saveRecipeRelation(recipe, savedData[0].id)

        return res.status(201).json({ message: 'success', statusCode: 201 });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
};

const getRecipes = async (req, res) => {
    const user_id = req.body.user_id;

    try {
        if (!user_id) {
            return res.status(400).json({ error: 'User Id is required', statusCode: 400 });
        }
        let recipeList = []
        let cuisineList = []
        let ingredientList = []

        const recipeRelation = await getUserRecipes.getUserRecipesRelation(user_id);
        if (recipeRelation.length === 0) {
            return res.status(404).json({ error: 'Recipes not found', statusCode: 404 });
        }

        for (let i = 0; i < recipeRelation.length; i++) {
            if (i === 0) {
                recipeList.push(recipeRelation[i].recipe_id);
                cuisineList.push(recipeRelation[i].cuisine_id)
                ingredientList.push(recipeRelation[i].ingredient_id)
            }
            else if (recipeList.indexOf(recipeRelation[i].recipe_id) < 0) {
                recipeList.push(recipeRelation[i].recipe_id);
            }
            else if (cuisineList.indexOf(recipeRelation[i].cuisine_id) < 0) {
                cuisineList.push(recipeRelation[i].cuisine_id)
            }
            else if (ingredientList.indexOf(recipeRelation[i].ingredient_id) < 0) {
                ingredientList.push(recipeRelation[i].ingredient_id)
            }
        };

        const recipes = await getUserRecipes.getUserRecipes(recipeList)
        if (recipes.length === 0) {
            return res.status(404).json({ error: 'Recipes not found', statusCode: 404 });
        }

        const ingredients = await getUserRecipes.getIngredients(ingredientList)
        if (ingredients.length === 0) {
            return res.status(404).json({ error: 'Ingredients not found', statusCode: 404 });
        }

        const cuisines = await getUserRecipes.getCuisines(cuisineList)
        if (cuisines.length === 0) {
            return res.status(404).json({ error: 'Cuisines not found', statusCode: 404 });
        }

        recipes.forEach(function (recipe) {
            cuisines.forEach(function (element) {
                if (recipe.cuisine_id == element.id) {
                    recipe["cuisine_name"] = element.name
                }
            });

            recipe.ingredients["category"] = [];
            recipe.ingredients["name"] = [];
            recipe.ingredients.id.forEach(function (ingredient) {
                ingredients.forEach(function (element) {
                    if (ingredient == element.id) {
                        recipe.ingredients.name.push(element.name)
                        recipe.ingredients.category.push(element.category)
                    }
                });
            });
        });


        return res.status(200).json({ message: 'success', statusCode: 200, recipes: recipes });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
};

module.exports = { createAndSaveRecipe, getRecipes };