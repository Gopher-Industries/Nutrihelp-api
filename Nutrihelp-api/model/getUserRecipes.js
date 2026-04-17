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
			let x = `${process.env.SUPABASE_STORAGE_URL}${data[0].file_name}`;
			return x;
		}
		return data;
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
};
