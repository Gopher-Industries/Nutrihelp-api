let { add, get, deletePlan } = require("../model/mealPlan.js");

// Function to add a meal plan
const addMealPlan = async (req, res) => {
  try {
    const { recipe_ids, meal_type, user_id } = req.body;

    // Validate required fields
    if (!recipe_ids || !Array.isArray(recipe_ids) || recipe_ids.length === 0) {
      return res
        .status(400)
        .json({ error: "Recipes are required and must be a non-empty array" });
    }

    if (!meal_type || typeof meal_type !== "string") {
      return res
        .status(400)
        .json({ error: "Meal Type is required and must be a string" });
    }

    if (!user_id || typeof user_id !== "string" || user_id.length !== 24) {
      return res.status(400).json({
        error: "UserId is required and must be a valid 24-character string",
      });
    }

    // Proceed with adding the meal plan
    let meal_plan = await add(user_id, { recipe_ids }, meal_type);

    return res.status(201).json({
      message: "Meal plan created successfully",
      statusCode: 201,
      meal_plan,
    });
  } catch (error) {
    console.error("Error adding meal plan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to get a meal plan
const getMealPlan = async (req, res) => {
  try {
    const { id, user_id } = req.body;

    // Validate required fields
    if (!id || typeof id !== "string" || id.length !== 24) {
      return res.status(400).json({
        error: "Id is required and must be a valid 24-character string",
      });
    }

    if (!user_id || typeof user_id !== "string" || user_id.length !== 24) {
      return res.status(400).json({
        error: "UserId is required and must be a valid 24-character string",
      });
    }

    // Fetch the meal plan
    let meal_plan = await get(id, user_id);

    if (meal_plan) {
      return res.status(200).json({ meal_plan });
    }

    return res.status(404).json({ error: "Meal Plan not found" });
  } catch (error) {
    console.error("Error retrieving meal plan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to delete a meal plan
const deleteMealPlan = async (req, res) => {
  try {
    const { id, user_id } = req.body;

    // Validate required fields
    if (!id || typeof id !== "string" || id.length !== 24) {
      return res.status(400).json({
        error: "Id is required and must be a valid 24-character string",
      });
    }

    if (!user_id || typeof user_id !== "string" || user_id.length !== 24) {
      return res.status(400).json({
        error: "UserId is required and must be a valid 24-character string",
      });
    }

    // Proceed with deleting the meal plan
    await deletePlan(id, user_id);

    return res
      .status(204)
      .json({ message: "Meal plan deleted successfully", statusCode: 204 });
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { addMealPlan, getMealPlan, deleteMealPlan };
