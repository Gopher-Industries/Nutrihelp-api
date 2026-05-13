let createRecipe = require("../model/createRecipe.js");
let getUserRecipes = require("../model/getUserRecipes.js");
let deleteUserRecipes = require("../model/deleteUserRecipes.js");
const supabase = require("../dbConnection.js");
const { validationResult } = require('express-validator');
const normalizeId = require('../utils/normalizeId');

const RECIPE_COMMUNITY_TYPES = [
	"recipe_community_request",
	"recipe_community_approved",
	"recipe_community_private",
	"recipe_community_rejected",
];

const resolveRecipeUserId = (req) => {
	const requestUserId = req.body?.user_id || req.query?.user_id || req.params?.user_id;
	const currentUserId = req.user?.userId;
	const role = String(req.user?.role || '').toLowerCase();

	if ((role === 'admin' || role === 'nutritionist') && requestUserId) {
		return normalizeId(requestUserId);
	}

	return normalizeId(currentUserId);
};

function normalizeVisibility(value) {
	const normalized = String(value || "").trim().toLowerCase();
	if (normalized === "community_pending" || normalized === "pending") return "community_pending";
	if (normalized === "community" || normalized === "published") return "community";
	if (normalized === "community_rejected" || normalized === "rejected") return "community_rejected";
	return "user_private";
}

function getRecipeImageUrl(fileName) {
	const normalized = String(fileName || "").trim();
	if (!normalized) return "";
	const { data } = supabase.storage.from("images").getPublicUrl(normalized);
	return data?.publicUrl || "";
}

function getRecipeNotificationToken(recipeId) {
	return `recipe_id:${Number(recipeId)};`;
}

function deriveRecipeVisibility(recipe) {
	const storedVisibility = recipe?.visibility || recipe?.community_status || recipe?.recipe_visibility;
	if (storedVisibility) return normalizeVisibility(storedVisibility);
	// Legacy fallback for rows created before recipes.visibility existed.
	if (recipe?.is_published === true) return "community";
	return "user_private";
}

function buildRequestMarker(recipe, state) {
	return `${getRecipeNotificationToken(recipe.id)}state:${state};title:${recipe.recipe_name || "Untitled recipe"}`;
}

async function decorateRecipes(rows = []) {
	const recipes = Array.isArray(rows) ? rows : [];
	const cuisineIds = [...new Set(recipes.map((row) => row?.cuisine_id).filter(Boolean))];
	const recipeImageIds = [...new Set(recipes.map((row) => row?.image_id).filter(Boolean))];
	const userIds = [
		...new Set(
			recipes
				.map((row) => row?.user_id || row?.author_id)
				.filter(Boolean)
		),
	];

	const [cuisineResult, userResult] = await Promise.all([
		cuisineIds.length
			? supabase.from("cuisines").select("id,name").in("id", cuisineIds)
			: Promise.resolve({ data: [], error: null }),
		userIds.length
			? supabase
				.from("users")
				.select("user_id,name,first_name,last_name,email,image_id")
					.in("user_id", userIds)
				: Promise.resolve({ data: [], error: null }),
	]);

	if (cuisineResult.error) throw cuisineResult.error;
	if (userResult.error) throw userResult.error;

	const authorImageIds = (userResult.data || []).map((user) => user?.image_id).filter(Boolean);
	const imageIds = [...new Set([...recipeImageIds, ...authorImageIds])];
	const imageResult = imageIds.length
		? await supabase.from("images").select("id,file_name,display_name,file_size").in("id", imageIds)
		: { data: [], error: null };

	if (imageResult.error) throw imageResult.error;

	const cuisinesById = new Map((cuisineResult.data || []).map((item) => [Number(item.id), item]));
	const imagesById = new Map((imageResult.data || []).map((item) => [Number(item.id), item]));
	const usersById = new Map((userResult.data || []).map((item) => [Number(item.user_id), item]));

	return recipes.map((recipe) => {
		const image = imagesById.get(Number(recipe?.image_id));
		const author = usersById.get(Number(recipe?.user_id || recipe?.author_id));
		const authorImage = imagesById.get(Number(author?.image_id));
		const inferredImagePath = recipe?.image_id ? `recipe/${recipe.id}.webp` : "";
		const imageFileName = image?.file_name || inferredImagePath;
		const authorName = [
			author?.first_name,
			author?.last_name,
		].filter(Boolean).join(" ").trim() || author?.name || String(author?.email || "").split("@")[0] || `User ${recipe?.user_id || recipe?.author_id || ""}`.trim();

		return {
			...recipe,
			cuisine_name: cuisinesById.get(Number(recipe?.cuisine_id))?.name || "",
			recipe_visibility: deriveRecipeVisibility(recipe),
			image_file_name: imageFileName,
			image_file_size: image?.file_size || "",
			image_url: recipe?.image_url || getRecipeImageUrl(image?.file_name) || getRecipeImageUrl(inferredImagePath),
			author_user_id: recipe?.user_id || recipe?.author_id || null,
			author_name: authorName || "NutriHelp user",
			author_avatar_url: getRecipeImageUrl(authorImage?.file_name),
		};
	});
}

async function getDirectUserRecipes(userId) {
	const { data, error } = await supabase
		.from("recipes")
		.select("*")
		.eq("user_id", Number(userId))
		.order("created_at", { ascending: false });

	if (error) throw error;
	return decorateRecipes(data || []);
}

const createAndSaveRecipe = async (req, res) => {
	const {
		ingredient_id,
		ingredient_quantity,
		ingredient_cost,
		ingredient_costs,
		ingredientCost,
		recipe_name,
		cuisine_id,
		total_servings,
		preparation_time,
		instructions,
		recipe_image,
		cooking_method_id,
	} = req.body;
	const ingredientCostList =
		Array.isArray(ingredient_cost)
			? ingredient_cost
			: Array.isArray(ingredient_costs)
				? ingredient_costs
				: Array.isArray(ingredientCost)
					? ingredientCost
					: [];

	try {
		const user_id = resolveRecipeUserId(req);
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
			cooking_method_id,
			ingredientCostList
		);

		let savedData = await createRecipe.saveRecipe(recipe);

		if (recipe_image) {
			const imageUrl = await createRecipe.saveImage(recipe_image, savedData[0].id);
			if (imageUrl) {
				recipe.image_url = imageUrl;
				recipe.image_source = "user_upload";
				recipe.image_attribution = "User uploaded image";
			}
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
	const user_id = resolveRecipeUserId(req);

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
			const directRecipes = await getDirectUserRecipes(user_id);
			return res
				.status(200)
				.json({ message: "success", statusCode: 200, recipes: directRecipes });
		}

		for (let i = 0; i < recipeRelation.length; i++) {
			if (recipeList.indexOf(recipeRelation[i].recipe_id) < 0) {
				recipeList.push(recipeRelation[i].recipe_id);
			}
			if (
				recipeRelation[i].cuisine_id &&
				cuisineList.indexOf(recipeRelation[i].cuisine_id) < 0
			) {
				cuisineList.push(recipeRelation[i].cuisine_id);
			}
			if (
				recipeRelation[i].ingredient_id &&
				ingredientList.indexOf(recipeRelation[i].ingredient_id) < 0
			) {
				ingredientList.push(recipeRelation[i].ingredient_id);
			}
		}

		const recipes = await getUserRecipes.getUserRecipes(recipeList);
		if (recipes.length === 0) {
			const directRecipes = await getDirectUserRecipes(user_id);
			return res
				.status(200)
				.json({ message: "success", statusCode: 200, recipes: directRecipes });
		}

		const ingredientIdsFromRecipes = [
			...new Set(
				recipes.flatMap((recipe) =>
					Array.isArray(recipe?.ingredients?.id) ? recipe.ingredients.id : []
				)
			),
		].filter(Boolean);
		const cuisineIdsFromRecipes = [
			...new Set(recipes.map((recipe) => recipe?.cuisine_id).filter(Boolean)),
		];
		const ingredients = await getUserRecipes.getIngredients(
			ingredientIdsFromRecipes.length > 0 ? ingredientIdsFromRecipes : ingredientList
		);
		const cuisines = await getUserRecipes.getCuisines(
			cuisineIdsFromRecipes.length > 0 ? cuisineIdsFromRecipes : cuisineList
		);
		const ingredientsById = new Map((ingredients || []).map((item) => [Number(item.id), item]));

		await Promise.all(
			recipes.map(async (recipe) => {
				for (const element of cuisines) {
					if (recipe.cuisine_id == element.id) {
						recipe["cuisine_name"] = element.name;
					}
				}
				if (!recipe.ingredients || typeof recipe.ingredients !== "object") {
					recipe.ingredients = { id: [], category: [], name: [] };
				}
				recipe.ingredients.id = Array.isArray(recipe.ingredients.id) ? recipe.ingredients.id : [];
				recipe.ingredients["category"] = [];
				recipe.ingredients["name"] = [];
				for (const ingredient of recipe.ingredients.id) {
					const element = ingredientsById.get(Number(ingredient));
					if (element) {
						recipe.ingredients.name.push(element.name);
						recipe.ingredients.category.push(element.category);
					}
				}

				let imageId = recipe.image_id;
				if (!imageId) {
					imageId = await getUserRecipes.findReusableRecipeImageId(
						user_id,
						recipe.recipe_name,
						recipe.id
					);
				}

				recipe.image_id = imageId;
				recipe.image_url = await getUserRecipes.getImageUrl(imageId);
			})
		);

		const decoratedRecipes = await decorateRecipes(recipes);

		return res
			.status(200)
			.json({ message: "success", statusCode: 200, recipes: decoratedRecipes });
	} catch (error) {
		console.error("Error logging in:", error);
		return res
			.status(500)
			.json({ error: "Internal server error", statusCode: 500 });
	}
};

const listAdminRecipes = async (req, res) => {
	try {
		const limit = Math.max(1, Math.min(Number(req.query.limit) || 1000, 3000));
		const { data, error } = await supabase
			.from("recipes")
			.select("*")
			.order("created_at", { ascending: false })
			.limit(limit);

		if (error) throw error;

		const recipes = await decorateRecipes(data || []);
		return res.status(200).json({ message: "success", statusCode: 200, recipes });
	} catch (error) {
		console.error("Error loading admin recipes:", error);
		return res.status(500).json({ error: "Internal server error", statusCode: 500 });
	}
};

/**
 * GET /api/recipe/community
 *
 * Refined to accept light discovery filters so the frontend does not need a
 * parallel "community discovery" endpoint. Supported query parameters:
 *   - search             partial match on recipe_name (ILIKE)
 *   - cuisine_id         numeric cuisine filter
 *   - cooking_method_id  numeric cooking method filter
 *   - sort               "latest" (default) | "oldest" | "name"
 *   - limit              page size (default 300, max 1000)
 *   - offset             pagination offset (default 0)
 *
 * Anything beyond this (favourites, client-side reordering, etc.) stays in
 * the frontend — see docs/RECIPES_SCOPE.md.
 */
const listCommunityRecipes = async (req, res) => {
	try {
		const limit = Math.max(1, Math.min(Number(req.query.limit) || 300, 1000));
		const offset = Math.max(0, Number(req.query.offset) || 0);
		const { search, cuisine_id, cooking_method_id, sort } = req.query;

		let query = supabase
			.from("recipes")
			.select("*")
			.eq("visibility", "community")
			.eq("is_published", true);

		if (search) {
			const safeSearch = String(search).replace(/[%_]/g, (c) => `\\${c}`);
			query = query.ilike("recipe_name", `%${safeSearch}%`);
		}

		if (cuisine_id) {
			const cuisineIdNum = Number.parseInt(cuisine_id, 10);
			if (!Number.isFinite(cuisineIdNum)) {
				return res.status(400).json({ error: "cuisine_id must be numeric", statusCode: 400 });
			}
			query = query.eq("cuisine_id", cuisineIdNum);
		}

		if (cooking_method_id) {
			const cookingMethodIdNum = Number.parseInt(cooking_method_id, 10);
			if (!Number.isFinite(cookingMethodIdNum)) {
				return res.status(400).json({ error: "cooking_method_id must be numeric", statusCode: 400 });
			}
			query = query.eq("cooking_method_id", cookingMethodIdNum);
		}

		switch (String(sort || "").toLowerCase()) {
			case "oldest":
				query = query.order("published_at", { ascending: true });
				break;
			case "name":
				query = query.order("recipe_name", { ascending: true });
				break;
			case "latest":
			default:
				query = query.order("published_at", { ascending: false });
				break;
		}

		query = query.range(offset, offset + limit - 1);

		const { data, error } = await query;
		if (error) throw error;

		const recipes = await decorateRecipes(data || []);
		return res.status(200).json({
			message: "success",
			statusCode: 200,
			recipes,
			pagination: { limit, offset, count: recipes.length },
		});
	} catch (error) {
		console.error("Error loading community recipes:", error);
		return res.status(500).json({ error: "Internal server error", statusCode: 500 });
	}
};

const shareRecipeToCommunity = async (req, res) => {
	const recipeId = Number(req.params.id);
	// Ownership is derived from the authenticated session; we deliberately
	// ignore any user_id supplied in the request body so a caller cannot
	// submit someone else's recipe for community review.
	const userId = Number(req.user?.userId);

	try {
		if (!recipeId || !userId) {
			return res.status(400).json({ error: "Recipe ID and authenticated user are required", statusCode: 400 });
		}

		const { data: recipe, error: recipeError } = await supabase
			.from("recipes")
			.select("*")
			.eq("id", recipeId)
			.eq("user_id", userId)
			.single();

		if (recipeError || !recipe) {
			return res.status(404).json({ error: "Recipe not found", statusCode: 404 });
		}

		const { error: updateError } = await supabase
			.from("recipes")
			.update({ visibility: "community_pending", is_published: false, published_at: null })
			.eq("id", recipeId);
		if (updateError) throw updateError;

		const { error: notificationError } = await supabase
			.from("notifications")
			.insert({
				user_id: userId,
				type: "recipe_community_request",
				content: buildRequestMarker(recipe, "community_pending"),
				status: "read",
			});

		if (notificationError) throw notificationError;

		return res.status(200).json({
			message: "Recipe submitted for community review",
			statusCode: 200,
			recipe_id: recipeId,
			visibility: "community_pending",
		});
	} catch (error) {
		console.error("Error sharing recipe to community:", error);
		return res.status(500).json({ error: "Internal server error", statusCode: 500 });
	}
};

const unshareRecipeFromCommunity = async (req, res) => {
	const recipeId = Number(req.params.id);
	// Ownership is derived from the authenticated session — see
	// shareRecipeToCommunity for rationale.
	const userId = Number(req.user?.userId);

	try {
		if (!recipeId || !userId) {
			return res.status(400).json({ error: "Recipe ID and authenticated user are required", statusCode: 400 });
		}

		const { data: recipe, error: recipeError } = await supabase
			.from("recipes")
			.select("*")
			.eq("id", recipeId)
			.eq("user_id", userId)
			.single();

		if (recipeError || !recipe) {
			return res.status(404).json({ error: "Recipe not found", statusCode: 404 });
		}

		const currentVisibility = deriveRecipeVisibility(recipe);
		if (currentVisibility === "user_private") {
			return res.status(200).json({
				message: "Recipe is already private",
				statusCode: 200,
				recipe_id: recipeId,
				visibility: "user_private",
			});
		}

		const { error: updateError } = await supabase
			.from("recipes")
			.update({ visibility: "user_private", is_published: false, published_at: null })
			.eq("id", recipeId)
			.eq("user_id", userId);
		if (updateError) throw updateError;

		const { error: notificationError } = await supabase
			.from("notifications")
			.insert({
				user_id: userId,
				type: "recipe_community_private",
				content: buildRequestMarker(recipe, "user_private"),
				status: "read",
			});

		if (notificationError) throw notificationError;

		return res.status(200).json({
			message: "Recipe community sharing stopped",
			statusCode: 200,
			recipe_id: recipeId,
			visibility: "user_private",
		});
	} catch (error) {
		console.error("Error unsharing recipe from community:", error);
		return res.status(500).json({ error: "Internal server error", statusCode: 500 });
	}
};

const updateRecipeCommunityVisibility = async (req, res) => {
	const recipeId = Number(req.params.id);
	const visibility = normalizeVisibility(req.body.visibility);

	try {
		if (!recipeId) {
			return res.status(400).json({ error: "Recipe ID is required", statusCode: 400 });
		}

		const { data: recipe, error: recipeError } = await supabase
			.from("recipes")
			.select("*")
			.eq("id", recipeId)
			.single();

		if (recipeError || !recipe) {
			return res.status(404).json({ error: "Recipe not found", statusCode: 404 });
		}

		const now = new Date().toISOString();
		const updatePayload =
			visibility === "community"
				? { visibility, is_published: true, published_at: now }
				: { visibility, is_published: false, published_at: null };

		const { data: updatedRows, error: updateError } = await supabase
			.from("recipes")
			.update(updatePayload)
			.eq("id", recipeId)
			.select("*");

		if (updateError) throw updateError;

		const updatedRecipe = updatedRows?.[0] || { ...recipe, ...updatePayload };
		const markerType =
			visibility === "community"
				? "recipe_community_approved"
				: visibility === "community_pending"
					? "recipe_community_request"
					: visibility === "community_rejected"
						? "recipe_community_rejected"
						: "recipe_community_private";
		const markerStatus = ["community", "community_rejected"].includes(visibility) ? "unread" : "read";
		const markerContent =
			visibility === "community"
				? `Your recipe was approved for Community Explore. Recipe ID: ${recipeId}. ${recipe.recipe_name || ""}`.trim()
				: visibility === "community_rejected"
					? `Your recipe was not approved for Community Explore. Recipe ID: ${recipeId}. ${recipe.recipe_name || ""}`.trim()
					: buildRequestMarker(recipe, visibility);

		const { error: notificationError } = await supabase
			.from("notifications")
			.insert({
				user_id: Number(recipe.user_id),
				type: markerType,
				content: markerContent.includes(getRecipeNotificationToken(recipeId))
					? markerContent
					: `${markerContent} ${buildRequestMarker(recipe, visibility)}`,
				status: markerStatus,
			});

		if (notificationError) throw notificationError;

		const [decorated] = await decorateRecipes([updatedRecipe]);
		return res.status(200).json({
			message: "Recipe visibility updated",
			statusCode: 200,
			recipe: decorated,
		});
	} catch (error) {
		console.error("Error updating recipe visibility:", error);
		return res.status(500).json({ error: "Internal server error", statusCode: 500 });
	}
};

const deleteRecipe = async (req, res) => {
	const user_id = resolveRecipeUserId(req);
	const { recipe_id } = req.body;

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

module.exports = {
	createAndSaveRecipe,
	getRecipes,
	deleteRecipe,
	listAdminRecipes,
	listCommunityRecipes,
	shareRecipeToCommunity,
	unshareRecipeFromCommunity,
	updateRecipeCommunityVisibility,
};
