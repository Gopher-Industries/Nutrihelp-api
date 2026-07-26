const supabase = require("../dbConnection.js");

async function createRecipe(
	user_id,
	ingredient_id,
	ingredient_quantity,
	recipe_name,
	cuisine_id,
	total_servings,
	preparation_time,
	instructions,
	cooking_method_id,
	ingredient_cost = []
) {
	const normalizedIngredientCost = Array.isArray(ingredient_cost)
		? ingredient_cost.map((value) => {
			const parsed = Number(value);
			return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null;
		})
		: [];

	recipe = {
		user_id: user_id,
		recipe_name: recipe_name,
		cuisine_id: cuisine_id,
		total_servings: total_servings,
		preparation_time: preparation_time,
		visibility: "user_private",
		is_published: false,
		published_at: null,
		ingredients: {
			id: ingredient_id,
			quantity: ingredient_quantity,
			cost: normalizedIngredientCost,
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
		if (error) throw error;
		return data;
	} catch (error) {
		throw error;
	}
}

function parseBase64Image(image) {
	const raw = String(image || "");
	const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+)(?:;[^,]*)?;base64,(.+)$/);
	let base64 = raw;
	let mimeType = "image/png";

	if (match) {
		mimeType = match[1];
		base64 = match[2];
	} else if (raw.includes(",")) {
		base64 = raw.split(",").pop();
	}

	const buffer = Buffer.from(base64, "base64");
	const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
	const isPng =
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47;
	const isWebp =
		buffer.toString("ascii", 0, 4) === "RIFF" &&
		buffer.toString("ascii", 8, 12) === "WEBP";

	if (!isJpeg && !isPng && !isWebp) {
		throw new Error("Recipe image is not a valid JPEG, PNG, or WebP file");
	}

	if (isJpeg) return { buffer, mimeType: "image/jpeg", extension: "jpg" };
	if (isPng) return { buffer, mimeType: "image/png", extension: "png" };
	return { buffer, mimeType: "image/webp", extension: "webp" };
}

async function saveImage(image, recipe_id) {
	if (image === undefined || image === null) return null;

	try {
		const parsed = parseBase64Image(image);
		let file_name = `recipe/${recipe_id}.${parsed.extension}`;

		await supabase.storage.from("images").remove([file_name]);

		const { error: uploadError } = await supabase.storage.from("images").upload(file_name, parsed.buffer, {
			cacheControl: "3600",
			contentType: parsed.mimeType,
			upsert: true,
		});
		if (uploadError) throw uploadError;

		const test = {
			file_name: file_name,
			display_name: file_name,
			file_size: base64FileSize(image),
		};

		let { data: image_data, error: imageInsertError } = await supabase
			.from("images")
			.insert(test)
			.select("*");
		if (imageInsertError) throw imageInsertError;

		const { error: recipeUpdateError } = await supabase
			.from("recipes")
			.update({ image_id: image_data[0].id }) // e.g { email: "sample@email.com" }
			.eq("id", recipe_id);
		if (recipeUpdateError) throw recipeUpdateError;

		const { data: publicImage } = supabase.storage.from("images").getPublicUrl(file_name);
		return publicImage?.publicUrl || `${process.env.SUPABASE_STORAGE_URL || ""}${file_name}`;
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
		const uniqueIngredientIds = [...new Set(recipe.ingredients.id)];
		
		const insert_object = uniqueIngredientIds.map((ingredientId) => ({
			ingredient_id: ingredientId,
			recipe_id: savedDataId,
			user_id: recipe.user_id,
			cuisine_id: recipe.cuisine_id,
			cooking_method_id: recipe.cooking_method_id,
		}));

		let { data, error } = await supabase
			.from("recipe_ingredient")
			.insert(insert_object)
			.select();

		if(error){
			console.error("insert error",error);
			throw error;
		}
		
		return data;
	} catch (error) {
		throw error;
	}
}

async function updateRecipesFlag(ids, field, value = true) {
	if (!Array.isArray(ids) || ids.length === 0) return [];

	const { data, error } = await supabase
		.from("recipes")
		.update({ [field]: value })
		.in("id", ids);

	if (error) {
		console.error(`updateRecipesFlag (${field}) error:`, error);
		throw error;
	}

	return data;
}

const updateRecipeAllergy = (ids) =>
	updateRecipesFlag(ids, "allergy", true);

const updateRecipeDislike = (ids) =>
	updateRecipesFlag(ids, "dislike", true);


module.exports = { createRecipe, saveRecipe, saveRecipeRelation, saveImage, updateRecipeAllergy, updateRecipeDislike };
