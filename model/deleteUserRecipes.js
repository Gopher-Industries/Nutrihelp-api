const supabase = require('../dbConnection.js');

async function deleteUserRecipes(user_id, recipe_id ) {

    try {
        const { data: recipeRows, error: recipeLookupError } = await supabase
            .from('recipes')
            .select('id, image_id')
            .eq('id', recipe_id)
            .eq('user_id', user_id)
            .limit(1);
        if (recipeLookupError) throw recipeLookupError;

        const recipe = recipeRows?.[0];
        if (!recipe) {
            return [];
        }

        let imageRow = null;
        if (recipe.image_id) {
            const { data: imageRows, error: imageLookupError } = await supabase
                .from('images')
                .select('id, file_name')
                .eq('id', recipe.image_id)
                .limit(1);
            if (imageLookupError) throw imageLookupError;
            imageRow = imageRows?.[0] || null;
        }

        const { error: relationError } = await supabase
            .from('recipe_ingredient')
            .delete()
            .eq('recipe_id', recipe_id)
            .eq('user_id', user_id);
        if (relationError) throw relationError;

        const { error: libraryError } = await supabase
            .from('recipe_library')
            .delete()
            .eq('legacy_recipe_id', recipe_id)
            .eq('owner_user_id', user_id);
        if (libraryError) throw libraryError;

        const { data, error } = await supabase
            .from('recipes')
            .delete()
            .eq('id', recipe_id)
            .eq('user_id', user_id)
            .select();
        if (error) throw error;

        if (imageRow?.file_name) {
            const { error: storageError } = await supabase.storage
                .from('images')
                .remove([imageRow.file_name]);
            if (storageError) console.warn('Recipe image storage cleanup skipped:', storageError.message);

            const { error: imageDeleteError } = await supabase
                .from('images')
                .delete()
                .eq('id', imageRow.id);
            if (imageDeleteError) console.warn('Recipe image row cleanup skipped:', imageDeleteError.message);
        }

        return data;

    } catch (error) {
        throw error;
    }
}

module.exports = {deleteUserRecipes} 
