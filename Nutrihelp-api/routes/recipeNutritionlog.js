const express = require('express');
const router = express.Router();
const { getRecipeNutritionByName } = require('../controller/recipeNutritionController');

/**
 * @swagger
 * /api/recipe/nutrition:
 *   get:
 *     summary: Get full nutrition info for a recipe by name
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the recipe (case-insensitive)
 *     responses:
 *       200:
 *         description: Nutrition data found
 *       400:
 *         description: Missing query parameter
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Internal server error
 */
router.get('/', getRecipeNutritionByName);

module.exports = router;