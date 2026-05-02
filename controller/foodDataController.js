const normalizeId = require("../utils/normalizeId");
const FoodModel = require("../model/fooddata"); // Adjust path if needed

/**
 * Food Database controller - stabilized.
 */

const getMealPlan = async (req, res) => {
  const rawUserId = req.query?.user_id || req.query?.userId;

  try {
    if (!rawUserId) {
      return res.status(400).json({ success: false, error: "User Id is required" });
    }

    const userId = normalizeId(rawUserId);

    // Fetch from model
    const mealPlan = await FoodModel.getMealPlanByUserId(userId);

    return res.status(200).json({
      success: true,
      data: mealPlan || []
    });
  } catch (error) {
    console.error("❌ getMealPlan error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch meal plan", details: String(error.message || error) });
  }
};

const createMealPlan = async (req, res) => {
  const { user_id, meals } = req.body;

  try {
    if (!user_id) return res.status(400).json({ success: false, error: "user_id required" });

    const userId = normalizeId(user_id);
    const result = await FoodModel.createMealPlan(userId, meals);

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("❌ createMealPlan error:", error);
    return res.status(500).json({ success: false, error: "Failed to create meal plan", details: String(error.message || error) });
  }
};

const getNutritionByBarcode = async (req, res) => {
  const { barcode } = req.params;
  try {
    const data = await FoodModel.getNutritionByBarcode(barcode);

    // If barcode not found, return 404 so clients can differentiate
    if (!data) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ getNutritionByBarcode error:", error);
    return res.status(500).json({ success: false, error: "Barcode lookup failed", details: String(error.message || error) });
  }
};

module.exports = { getMealPlan, createMealPlan, getNutritionByBarcode };
