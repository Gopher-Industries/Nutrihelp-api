const supabase = require('../dbConnection.js');

async function getUserRecipesRelation(user_id) {
    try {
        let { data, error } = await supabase
            .from('recipe_ingredient')
            .select('*')
            .eq('user_id', user_id)
        return data

    } catch (error) {
        throw error;
    }
}

async function getUserRecipes(recipe_id) {
    try {
        let { data, error } = await supabase
            .from('recipes')
            .select('*')
            .in('id', recipe_id)
        return data

    } catch (error) {
        throw error;
    }
}

async function getIngredients(ingredient_id) {
    try {
        let { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .in('id', ingredient_id)
        return data

    } catch (error) {
        throw error;
    }
}

async function getCuisines(cuisine_id) {
    try {
        let { data, error } = await supabase
            .from('cuisines')
            .select('*')
            .in('id', cuisine_id)
        return data

    } catch (error) {
        throw error;
    }
}

module.exports = {getUserRecipesRelation, getUserRecipes, getCuisines, getIngredients};