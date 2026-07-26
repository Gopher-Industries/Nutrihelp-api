const supabase = require("../dbConnection.js");

async function getUserRecipesRelation(user_id) {
	try {
		let { data, error } = await supabase
			.from("recipe_ingredient")
			.select("*")
			.eq("user_id", user_id);
		return data;
	} catch (error) {
		throw error;
	}
}

async function getUserRecipes(recipe_id) {
	try {
		let { data, error } = await supabase
			.from("recipes")
			.select("*")
			.in("id", recipe_id);
		return data;
	} catch (error) {
		throw error;
	}
}

async function getIngredients(ingredient_id) {
	try {
		let { data, error } = await supabase
			.from("ingredients")
			.select("*")
			.in("id", ingredient_id);
		return data;
	} catch (error) {
		throw error;
	}
}

async function getCuisines(cuisine_id) {
	try {
		let { data, error } = await supabase
			.from("cuisines")
			.select("*")
			.in("id", cuisine_id);
		return data;
	} catch (error) {
		throw error;
	}
}

async function getImageUrl(image_id) {
	try {
		if (image_id == null) return "";
		let { data, error } = await supabase
			.from("images")
			.select("*")
			.eq("id", image_id);

		if (data[0] != null) {
			const { data: publicImage } = supabase.storage.from("images").getPublicUrl(data[0].file_name);
			return publicImage?.publicUrl || `${process.env.SUPABASE_STORAGE_URL || ""}${data[0].file_name}`;
		}
		return data;
	} catch (error) {
		console.log(error);
		throw error;
	}
}

async function findReusableRecipeImageId(user_id, recipe_name, excluded_recipe_id = null) {
	try {
		let query = supabase
			.from("recipes")
			.select("id, image_id")
			.eq("user_id", user_id)
			.eq("recipe_name", recipe_name)
			.not("image_id", "is", null)
			.order("id", { ascending: false })
			.limit(1);

		if (excluded_recipe_id) {
			query = query.neq("id", excluded_recipe_id);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data?.[0]?.image_id || null;
	} catch (error) {
		console.log(error);
		throw error;
	}
}

module.exports = {
	getUserRecipesRelation,
	getUserRecipes,
	getCuisines,
	getIngredients,
	getImageUrl,
	findReusableRecipeImageId,
};
