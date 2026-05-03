let createRecipe = require("../model/createRecipe.js");
let getUserRecipes = require("../model/getUserRecipes.js");
let deleteUserRecipes = require("../model/deleteUserRecipes.js");
const { validationResult } = require('express-validator');
const supabase = require('../dbConnection.js');
const {
	createSuccessResponse,
	createErrorResponse,
	formatRecipe,
} = require('../services/apiResponseService');

async function enrichRecipeRow(recipe) {
	if (!recipe) return null;

	const enrichedRecipe = { ...recipe };

	if (recipe.cuisine_id) {
		const cuisines = await getUserRecipes.getCuisines([recipe.cuisine_id]);
		enrichedRecipe.cuisine_name = cuisines?.[0]?.name || null;
	}

	if (recipe.image_id) {
		enrichedRecipe.image_url = await getUserRecipes.getImageUrl(recipe.image_id);
	} else {
		enrichedRecipe.image_url = "";
	}

	const ingredientIds = Array.isArray(recipe.ingredients?.id) ? recipe.ingredients.id : [];
	if (ingredientIds.length > 0) {
		const ingredients = await getUserRecipes.getIngredients(ingredientIds);
		const ingredientById = new Map((ingredients || []).map((item) => [item.id, item]));
		enrichedRecipe.ingredients = {
			...(recipe.ingredients || {}),
			name: ingredientIds.map((id) => ingredientById.get(id)?.name || null),
			category: ingredientIds.map((id) => ingredientById.get(id)?.category || null),
		};
	}

	return enrichedRecipe;
}

async function getRecipeDetailRow(recipeId) {
	const { data, error } = await supabase
		.from('recipes')
		.select('*')
		.eq('id', recipeId)
		.limit(1);

	if (error) {
		throw error;
	}

	return data?.[0] || null;
}

const createAndSaveRecipe = async (req, res) => {
	const {
		user_id,
		ingredient_id,
		ingredient_quantity,
		recipe_name,
		cuisine_id,
		total_servings,
		preparation_time,
		instructions,
		recipe_image,
		cooking_method_id,
	} = req.body;

	try {
		// if (
		// 	!user_id ||
		// 	!ingredient_id ||
		// 	!ingredient_quantity ||
		// 	!recipe_name ||
		// 	!cuisine_id ||
		// 	!total_servings ||
		// 	!preparation_time ||
		// 	!instructions ||
		// 	!cooking_method_id
		// ) {
		// 	return res.status(400).json({
		// 		error: "Recipe parameters are missed",
		// 		statusCode: 400,
		// 	});
		// }

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const recipe = await createRecipe.createRecipe(
			user_id,
			ingredient_id,
			ingredient_quantity,
			recipe_name,
			cuisine_id,
			total_servings,
			preparation_time,
			instructions,
			cooking_method_id
		);

		let savedData = await createRecipe.saveRecipe(recipe);

		if (recipe_image) {
			await createRecipe.saveImage(recipe_image, savedData[0].id);
		}

		const recipeIngredients = await createRecipe.saveRecipeRelation(recipe, savedData[0].id);
		
		const allergies = recipeIngredients
			.filter((r) => r.allergy)
			.map((r) => r.recipe_id);

		if (allergies.length > 0) {
			await createRecipe.updateRecipeAllergy(allergies);
		}

		const dislikes = recipeIngredients
			.filter((r) => r.dislike)
			.map((r) => r.recipe_id);

		if (dislikes.length > 0) {
			await createRecipe.updateRecipeDislike(dislikes);
		}

		return res.status(201).json({ message: "success", statusCode: 201 });
	} catch (error) {
		console.error("Error logging in:", error);
		return res
			.status(500)
			.json({ error: "Internal server error", statusCode: 500 });
	}
};

const getRecipes = async (req, res) => {
	const user_id = req.body.user_id;

	try {
		if (!user_id) {
			return res
				.status(400)
				.json({ error: "User Id is required", statusCode: 400 });
		}
		let recipeList = [];
		let cuisineList = [];
		let ingredientList = [];

		const recipeRelation = await getUserRecipes.getUserRecipesRelation(
			user_id
		);
		if (recipeRelation.length === 0) {
			return res
				.status(404)
				.json({ error: "Recipes not found", statusCode: 404 });
		}

		for (let i = 0; i < recipeRelation.length; i++) {
			if (i === 0) {
				recipeList.push(recipeRelation[i].recipe_id);
				cuisineList.push(recipeRelation[i].cuisine_id);
				ingredientList.push(recipeRelation[i].ingredient_id);
			} else if (recipeList.indexOf(recipeRelation[i].recipe_id) < 0) {
				recipeList.push(recipeRelation[i].recipe_id);
			} else if (cuisineList.indexOf(recipeRelation[i].cuisine_id) < 0) {
				cuisineList.push(recipeRelation[i].cuisine_id);
			} else if (
				ingredientList.indexOf(recipeRelation[i].ingredient_id) < 0
			) {
				ingredientList.push(recipeRelation[i].ingredient_id);
			}
		}

		const recipes = await getUserRecipes.getUserRecipes(recipeList);
		if (recipes.length === 0) {
			return res
				.status(404)
				.json({ error: "Recipes not found", statusCode: 404 });
		}

		const ingredients = await getUserRecipes.getIngredients(ingredientList);
		if (ingredients.length === 0) {
			return res
				.status(404)
				.json({ error: "Ingredients not found", statusCode: 404 });
		}

		const cuisines = await getUserRecipes.getCuisines(cuisineList);
		if (cuisines.length === 0) {
			return res
				.status(404)
				.json({ error: "Cuisines not found", statusCode: 404 });
		}

		await Promise.all(
			recipes.map(async (recipe) => {
				for (const element of cuisines) {
					if (recipe.cuisine_id == element.id) {
						recipe["cuisine_name"] = element.name;
					}
				}
				recipe.ingredients["category"] = [];
				recipe.ingredients["name"] = [];
				for (const ingredient of recipe.ingredients.id) {
					for (const element of ingredients) {
						if (ingredient == element.id) {
							recipe.ingredients.name.push(element.name);
							recipe.ingredients.category.push(element.category);
						}
					}
				}

				recipe.image_url = await getUserRecipes.getImageUrl(
					recipe.image_id
				);
			})
		);

		const formattedRecipes = recipes.map(formatRecipe);

		const response = createSuccessResponse({
			items: formattedRecipes,
			recipes: formattedRecipes
		}, {
			count: formattedRecipes.length
		});
		response.items = formattedRecipes;
		response.recipes = formattedRecipes;

		return res.status(200).json(response);
	} catch (error) {
		console.error("Error logging in:", error);
		return res
			.status(500)
			.json({ error: "Internal server error", statusCode: 500 });
	}
};

const getRecipeById = async (req, res) => {
	const recipeId = Number(req.params.id);

	try {
		if (!Number.isInteger(recipeId) || recipeId <= 0) {
			return res.status(400).json(createErrorResponse("Recipe ID is required", "VALIDATION_ERROR"));
		}

		const recipe = await getRecipeDetailRow(recipeId);
		if (!recipe) {
			return res.status(404).json(createErrorResponse("Recipe not found", "RECIPE_NOT_FOUND"));
		}

		const enrichedRecipe = await enrichRecipeRow(recipe);
		const formattedRecipe = formatRecipe(enrichedRecipe);

		const response = createSuccessResponse({
			item: formattedRecipe,
			recipe: formattedRecipe
		});
		Object.assign(response, formattedRecipe, {
			item: formattedRecipe,
			recipe: formattedRecipe,
		});

		return res.status(200).json(response);
	} catch (error) {
		console.error("Error retrieving recipe detail:", error);
		return res
			.status(500)
			.json(createErrorResponse("Internal server error", "RECIPE_DETAIL_FAILED"));
	}
};

const deleteRecipe = async (req, res) => {
	const { user_id, recipe_id } = req.body;

	try {
		if (!user_id || !recipe_id) {
			return res.status(400).json({
				error: "User Id or Recipe Id is required",
				statusCode: 404,
			});
		}

		await deleteUserRecipes.deleteUserRecipes(user_id, recipe_id);

		return res.status(200).json({ message: "success", statusCode: 204 });
	} catch (error) {
		console.error(error);
		return res
			.status(500)
			.json({ error: "Internal server error", statusCode: 500 });
	}
};

module.exports = { createAndSaveRecipe, getRecipes, getRecipeById, deleteRecipe };
