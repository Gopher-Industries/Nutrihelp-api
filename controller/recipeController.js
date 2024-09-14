let createRecipe = require('../model/createRecipe.js');
let getUserRecipes = require('../model/getUserRecipes.js');
let deleteUserRecipes = require('../model/deleteUserRecipes.js');

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
  } = req.body;

  try {
    // Validate presence of required fields
    if (
      !user_id ||
      !ingredient_id ||
      !ingredient_quantity ||
      !recipe_name ||
      !cuisine_id ||
      !total_servings ||
      !preparation_time ||
      !instructions
    ) {
      return res
        .status(400)
        .json({ error: "All fields are required", statusCode: 400 });
    }

    // Validate data types
    if (typeof user_id !== "string" || user_id.length !== 24) {
      return res
        .status(400)
        .json({
          error: "Invalid user_id, must be a 24-character string",
          statusCode: 400,
        });
    }

    if (!Array.isArray(ingredient_id) || ingredient_id.length === 0) {
      return res
        .status(400)
        .json({
          error: "ingredient_id must be a non-empty array",
          statusCode: 400,
        });
    }

    if (
      !Array.isArray(ingredient_quantity) ||
      ingredient_quantity.length === 0 ||
      ingredient_quantity.some((q) => typeof q !== "number" || q <= 0)
    ) {
      return res
        .status(400)
        .json({
          error:
            "ingredient_quantity must be a non-empty array of positive numbers",
          statusCode: 400,
        });
    }

    if (
      typeof recipe_name !== "string" ||
      recipe_name.length < 3 ||
      recipe_name.length > 100
    ) {
      return res
        .status(400)
        .json({
          error: "recipe_name must be a string between 3 and 100 characters",
          statusCode: 400,
        });
    }

    if (typeof cuisine_id !== "string" || cuisine_id.length !== 24) {
      return res
        .status(400)
        .json({
          error: "Invalid cuisine_id, must be a 24-character string",
          statusCode: 400,
        });
    }

    if (typeof total_servings !== "number" || total_servings <= 0) {
      return res
        .status(400)
        .json({
          error: "total_servings must be a positive number",
          statusCode: 400,
        });
    }

    if (typeof preparation_time !== "number" || preparation_time <= 0) {
      return res
        .status(400)
        .json({
          error: "preparation_time must be a positive number (in minutes)",
          statusCode: 400,
        });
    }

    if (
      !Array.isArray(instructions) ||
      instructions.length === 0 ||
      instructions.some((step) => typeof step !== "string" || step.length < 5)
    ) {
      return res
        .status(400)
        .json({
          error:
            "instructions must be a non-empty array of strings with at least 5 characters each",
          statusCode: 400,
        });
    }

    // Create the recipe
    const recipe = await createRecipe.createRecipe(
      user_id,
      ingredient_id,
      ingredient_quantity,
      recipe_name,
      cuisine_id,
      total_servings,
      preparation_time,
      instructions
    );

    // Save recipe and its relation
    let savedData = await createRecipe.saveRecipe(recipe);
    await createRecipe.saveRecipeRelation(recipe, savedData[0].id);

    return res
      .status(201)
      .json({
        message: "Recipe created and saved successfully",
        statusCode: 201,
      });
  } catch (error) {
    console.error("Error creating and saving recipe:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", statusCode: 500 });
  }
};


const getRecipes = async (req, res) => {
    const user_id = req.body.user_id;

    try {
        if (!user_id) {
            return res.status(400).json({ error: 'User Id is required', statusCode: 400 });
        }
        let recipeList = []
        let cuisineList = []
        let ingredientList = []

        const recipeRelation = await getUserRecipes.getUserRecipesRelation(user_id);
        if (recipeRelation.length === 0) {
            return res.status(404).json({ error: 'Recipes not found', statusCode: 404 });
        }

        for (let i = 0; i < recipeRelation.length; i++) {
            if (i === 0) {
                recipeList.push(recipeRelation[i].recipe_id);
                cuisineList.push(recipeRelation[i].cuisine_id)
                ingredientList.push(recipeRelation[i].ingredient_id)
            }
            else if (recipeList.indexOf(recipeRelation[i].recipe_id) < 0) {
                recipeList.push(recipeRelation[i].recipe_id);
            }
            else if (cuisineList.indexOf(recipeRelation[i].cuisine_id) < 0) {
                cuisineList.push(recipeRelation[i].cuisine_id)
            }
            else if (ingredientList.indexOf(recipeRelation[i].ingredient_id) < 0) {
                ingredientList.push(recipeRelation[i].ingredient_id)
            }
        };

        const recipes = await getUserRecipes.getUserRecipes(recipeList)
        if (recipes.length === 0) {
            return res.status(404).json({ error: 'Recipes not found', statusCode: 404 });
        }

        const ingredients = await getUserRecipes.getIngredients(ingredientList)
        if (ingredients.length === 0) {
            return res.status(404).json({ error: 'Ingredients not found', statusCode: 404 });
        }

        const cuisines = await getUserRecipes.getCuisines(cuisineList)
        if (cuisines.length === 0) {
            return res.status(404).json({ error: 'Cuisines not found', statusCode: 404 });
        }

        recipes.forEach(function (recipe) {
            cuisines.forEach(function (element) {
                if (recipe.cuisine_id == element.id) {
                    recipe["cuisine_name"] = element.name
                }
            });

            recipe.ingredients["category"] = [];
            recipe.ingredients["name"] = [];
            recipe.ingredients.id.forEach(function (ingredient) {
                ingredients.forEach(function (element) {
                    if (ingredient == element.id) {
                        recipe.ingredients.name.push(element.name)
                        recipe.ingredients.category.push(element.category)
                    }
                });
            });
        });


        return res.status(200).json({ message: 'success', statusCode: 200, recipes: recipes });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
};

const deleteRecipe = async (req, res) => {
    const { user_id, recipe_id } = req.body;

    try {
        if (!user_id || !recipe_id) {
            return res.status(400).json({ error: 'User Id or Recipe Id is required', statusCode: 404 });
        }

        await deleteUserRecipes.deleteUserRecipes(user_id, recipe_id)

        return res.status(200).json({ message: 'success', statusCode: 204 });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
};

module.exports = { createAndSaveRecipe, getRecipes, deleteRecipe };