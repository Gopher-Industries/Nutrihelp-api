const supabase = require('../dbConnection.js');

async function deleteUserRecipes(user_id, recipe_id ) {

    try {
        let { data, error } = await supabase
            .from('recipes')
            .delete()
            .eq('id', recipe_id)
            .eq('user_id', user_id)
            
        return data

    } catch (error) {
        throw error;
    }
}

module.exports = {deleteUserRecipes} 