let createRecipe = require('../model/createRecipe.js');
//let saveRecipe = require('../model/saveRecipe.js');
//let getUserRecipes = require('../model/getUserRecipes.js');

const createAndSaveRecipe = async (req, res) => {
    const { username, ingredient_id, ingredient_quantity,
        recipe_name, cuisine, total_servings, preparation_time, instuctions } = req.body;

    try {
        if (!username || !ingredient_id || !ingredient_quantity ||
            !recipe_name || !cuisine || !total_servings || !preparation_time || !instuctions) {
            return res.status(400).json({ error: 'Recipe parameters are missed', statusCode: 400 });
        }

        const recipe = await createRecipe(username, ingredient_id, ingredient_quantity,
            recipe_name, cuisine, total_servings, preparation_time, instuctions);

        //await saveRecipe(recipe);

        return res.status(201).json({ message: 'success', statusCode: 201 });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
};

const getRecipes = async (req, res) => {
    const username = req.body.username;

    try {
        if (!username) {
            return res.status(400).json({ error: 'Username is required', statusCode: 400 });
        }

        const recipes = await getUserRecipes(username);
        if (recipes.length === 0) {
            return res.status(404).json({ error: 'Recipes not found', statusCode: 404 });
        }

        return res.status(200).json({ message: 'success', statusCode: 200, recipes: recipes });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
};

module.exports = { createAndSaveRecipe, getRecipes };