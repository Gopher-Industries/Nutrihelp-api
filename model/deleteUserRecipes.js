const recipeRepository = require('../repositories/recipeRepository');

async function deleteUserRecipes(user_id, recipe_id ) {

    try {
        return await recipeRepository.deleteUserRecipe(user_id, recipe_id);

    } catch (error) {
        throw error;
    }
}

module.exports = {deleteUserRecipes} 
