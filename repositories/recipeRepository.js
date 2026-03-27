const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');
const mediaRepository = require('./mediaRepository');

async function findNutritionByRecipeName(recipeName) {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        recipe_name,
        calories,
        fat,
        carbohydrates,
        protein,
        fiber,
        vitamin_a,
        vitamin_b,
        vitamin_c,
        vitamin_d,
        sodium,
        sugar
      `)
      .ilike('recipe_name', recipeName);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load recipe nutrition by name', error, { recipeName });
  }
}

async function getIngredientsByIds(ingredientIds, select = '*') {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select(select)
      .in('id', ingredientIds);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load ingredients by ids', error, { ingredientIds });
  }
}

async function createRecipe(recipe) {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .insert(recipe)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create recipe', error);
  }
}

async function createRecipeRelations(relations) {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredient')
      .insert(relations)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create recipe relations', error);
  }
}

async function updateRecipesFlag(ids, field, value = true) {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .update({ [field]: value })
      .in('id', ids);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to update recipe flag', error, { ids, field });
  }
}

async function getUserRecipeRelations(userId) {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredient')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load user recipe relations', error, { userId });
  }
}

async function getRecipesByIds(recipeIds) {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .in('id', recipeIds);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load recipes by ids', error, { recipeIds });
  }
}

async function getCuisinesByIds(cuisineIds) {
  try {
    const { data, error } = await supabase
      .from('cuisines')
      .select('*')
      .in('id', cuisineIds);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load cuisines by ids', error, { cuisineIds });
  }
}

async function deleteUserRecipe(userId, recipeId) {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to delete user recipe', error, { userId, recipeId });
  }
}

async function getRecipeIngredientsByRecipeId(recipeId) {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('ingredients')
      .eq('id', recipeId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load recipe ingredients', error, { recipeId });
  }
}

async function getRecipesWithServings(recipeIds) {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('total_servings, ingredients')
      .in('id', recipeIds);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load recipe servings', error, { recipeIds });
  }
}

async function saveRecipeImage(image, recipeId, fileSize) {
  try {
    const fileName = `recipe/${recipeId}.png`;
    await mediaRepository.uploadImageToBucket(fileName, image, false);
    const imageData = await mediaRepository.createImageRecord({
      fileName,
      displayName: fileName,
      fileSize
    });

    await supabase
      .from('recipes')
      .update({ image_id: imageData[0].id })
      .eq('id', recipeId);

    return imageData;
  } catch (error) {
    throw wrapRepositoryError('Failed to save recipe image', error, { recipeId });
  }
}

module.exports = {
  createRecipe,
  createRecipeRelations,
  deleteUserRecipe,
  findNutritionByRecipeName,
  getCuisinesByIds,
  getIngredientsByIds,
  getRecipeIngredientsByRecipeId,
  getRecipesByIds,
  getRecipesWithServings,
  getUserRecipeRelations,
  saveRecipeImage,
  updateRecipesFlag
};
