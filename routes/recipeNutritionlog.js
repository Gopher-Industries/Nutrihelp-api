const express = require('express');
const router = express.Router();
const controller = require('../controller/recipeNutritionController');
const validate = require('../middleware/validate');
const { getRecipeNutritionQuery } = require('../validators/recipeNutritionValidator');

/**
 * GET /api/recipe/nutrition?name=...
 * - validates query param "name"
 * - delegates to controller.getRecipeNutritionByName
 */
router.get('/', validate(getRecipeNutritionQuery, 'query'), controller.getRecipeNutritionByName);

module.exports = router;
