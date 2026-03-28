const express = require('express');
const router = express.Router();
const recipeScalingController = require('../controller/recipeScalingController');

router.route('/:recipe_id/:desired_servings').get(recipeScalingController.scaleRecipe);

module.exports = router;