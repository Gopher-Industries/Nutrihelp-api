let createRecipe = require('../model/createRecipe.js');
//let saveRecipe = require('../model/saveRecipe.js');
//let getUserRecipes = require('../model/getUserRecipes.js');

const createAndSaveRecipe = async (req, res) => {
    const { username, ingredient_category, ingredient_name, ingredient_quantity,
            recipe_name, cuisine, total_servings, preparation_time, instuctions } = req.body;
    
    try {
        if (!username || !ingredient_category || !ingredient_name || !ingredient_quantity ||
            !recipe_name || !cuisine || !total_servings || !preparation_time || !instuctions) {
            return res.status(400).json({ error: 'Recipe parameters are missed' });
         }
        
        const recipe = await createRecipe (username, ingredient_category, ingredient_name, ingredient_quantity,
                                           recipe_name, cuisine, total_servings, preparation_time, instuctions);
        
        //await saveRecipe(recipe);

        return res.status(200).json({ message:'success', recipe:recipe });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const getRecipes = async (req, res) => {
    const username = req.body.username;
    
    try {
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
         }

        const recipes = await getUserRecipes(username);
        if (recipes.length === 0) {
            return res.status(404).json({ error: 'Recipes not found' });
        }

        return res.status(200).json({ message:'success', recipes:recipes });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { createAndSaveRecipe, getRecipes };