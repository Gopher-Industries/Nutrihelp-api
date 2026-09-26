const express = require('express');
const router = express.Router();
const recipeScalingController = require('../controller/recipeScalingController');
const validate = require('../middleware/validate');
const { scaleRecipeParams } = require('../validators/recipeScalingValidator');

/**
 * GET /api/recipe/scale/:recipe_id/:desired_servings
 * - validates params
 * - controller should handle numeric or UUID recipe_id (normalize inside controller)
 */
router.get('/:recipe_id/:desired_servings', validate(scaleRecipeParams, 'params'), recipeScalingController.scaleRecipe);

module.exports = router;
