const supabase = require("../dbConnection.js");
const { decode } = require("base64-arraybuffer");

async function createRecipe(
	user_id,
	ingredient_id,
	ingredient_quantity,
	recipe_name,
	cuisine_id,
	total_servings,
	preparation_time,
	instructions,
	cooking_method_id
) {
	recipe = {
		user_id: user_id,
		recipe_name: recipe_name,
		cuisine_id: cuisine_id,
		total_servings: total_servings,
		preparation_time: preparation_time,
		ingredients: {
			id: ingredient_id,
			quantity: ingredient_quantity,
		},
		cooking_method_id: cooking_method_id,
	};

	let calories = 0;
	let fat = 0.0;
	let carbohydrates = 0.0;
	let protein = 0.0;
	let fiber = 0.0;
	let vitamin_a = 0.0;
	let vitamin_b = 0.0;
	let vitamin_c = 0.0;
	let vitamin_d = 0.0;
	let sodium = 0.0;
	let sugar = 0.0;

	try {
		let { data, error } = await supabase
			.from("ingredients")
			.select("*")
			.in("id", ingredient_id);

		for (let i = 0; i < ingredient_id.length; i++) {
			for (let j = 0; j < data.length; j++) {
				if (data[j].id === ingredient_id[i]) {
					calories =
						calories +
						(data[j].calories / 100) * ingredient_quantity[i];
					fat = fat + (data[j].fat / 100) * ingredient_quantity[i];
					carbohydrates =
						carbohydrates +
						(data[j].carbohydrates / 100) * ingredient_quantity[i];
					protein =
						protein +
						(data[j].protein / 100) * ingredient_quantity[i];
					fiber =
						fiber + (data[j].fiber / 100) * ingredient_quantity[i];
					vitamin_a =
						vitamin_a +
						(data[j].vitamin_a / 100) * ingredient_quantity[i];
					vitamin_b =
						vitamin_b +
						(data[j].vitamin_b / 100) * ingredient_quantity[i];
					vitamin_c =
						vitamin_c +
						(data[j].vitamin_c / 100) * ingredient_quantity[i];
					vitamin_d =
						vitamin_d +
						(data[j].vitamin_d / 100) * ingredient_quantity[i];
					sodium =
						sodium +
						(data[j].sodium / 100) * ingredient_quantity[i];
					sugar =
						sugar + (data[j].sugar / 100) * ingredient_quantity[i];
				}
			}
		}

		recipe.instructions = instructions;
		recipe.calories = calories;
		recipe.fat = fat;
		recipe.carbohydrates = carbohydrates;
		recipe.protein = protein;
		recipe.fiber = fiber;
		recipe.vitamin_a = vitamin_a;
		recipe.vitamin_b = vitamin_b;
		recipe.vitamin_c = vitamin_c;
		recipe.vitamin_d = vitamin_d;
		recipe.sodium = sodium;
		recipe.sugar = sugar;

		return recipe;
	} catch (error) {
		throw error;
	}
}

async function saveRecipe(recipe) {
	try {
		let { data, error } = await supabase
			.from("recipes")
			.insert(recipe)
			.select();
		return data;
	} catch (error) {
		throw error;
	}
}

async function saveImage(image, recipe_id) {
	let file_name = `recipe/${recipe_id}.png`;
	if (image === undefined || image === null) return null;

	try {
		await supabase.storage.from("images").upload(file_name, decode(image), {
			cacheControl: "3600",
			upsert: false,
		});
		const test = {
			file_name: file_name,
			display_name: file_name,
			file_size: base64FileSize(image),
		};

		let { data: image_data } = await supabase
			.from("images")
			.insert(test)
			.select("*");

		await supabase
			.from("recipes")
			.update({ image_id: image_data[0].id }) // e.g { email: "sample@email.com" }
			.eq("id", recipe_id);
	} catch (error) {
		throw error;
	}
}

function base64FileSize(base64String) {
	let base64Data = base64String.split(",")[1] || base64String;

	let sizeInBytes = (base64Data.length * 3) / 4;

	if (base64Data.endsWith("==")) {
		sizeInBytes -= 2;
	} else if (base64Data.endsWith("=")) {
		sizeInBytes -= 1;
	}

	return sizeInBytes;
}

async function saveRecipeRelation(recipe, savedDataId) {
	try {
		insert_object = [];
		for (let i = 0; i < recipe.ingredients.id.length; i++) {
			insert_object.push({
				ingredient_id: recipe.ingredients.id[i],
				recipe_id: savedDataId,
				user_id: recipe.user_id,
				cuisine_id: recipe.cuisine_id,
				cooking_method_id: recipe.cooking_method_id[i],
			});
		}
		let { data, error } = await supabase
			.from("recipe_ingredient")
			.insert(insert_object)
			.select();
		return data;
	} catch (error) {
		throw error;
	}
}
module.exports = { createRecipe, saveRecipe, saveRecipeRelation, saveImage };
