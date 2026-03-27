const recipeRepository = require('../repositories/recipeRepository');
const mediaRepository = require('../repositories/mediaRepository');

async function getUserRecipesRelation(user_id) {
	try {
		return await recipeRepository.getUserRecipeRelations(user_id);
	} catch (error) {
		throw error;
	}
}

async function getUserRecipes(recipe_id) {
	try {
		return await recipeRepository.getRecipesByIds(recipe_id);
	} catch (error) {
		throw error;
	}
}

async function getIngredients(ingredient_id) {
	try {
		return await recipeRepository.getIngredientsByIds(ingredient_id);
	} catch (error) {
		throw error;
	}
}

async function getCuisines(cuisine_id) {
	try {
		return await recipeRepository.getCuisinesByIds(cuisine_id);
	} catch (error) {
		throw error;
	}
}

async function getImageUrl(image_id) {
	try {
		if (image_id == null) return "";
		let data = await mediaRepository.getImageById(image_id);

		if (data[0] != null) {
			let x = `${process.env.SUPABASE_STORAGE_URL}${data[0].file_name}`;
			return x;
		}
		return data;
	} catch (error) {
		console.error('[getUserRecipes] Failed to resolve image URL:', error);
		throw error;
	}
}

module.exports = {
	getUserRecipesRelation,
	getUserRecipes,
	getCuisines,
	getIngredients,
	getImageUrl,
};
