const express = require('express');
const router = express.Router();
const recipeController = require('../controller/recipeController.js');

router.route('/').post(recipeController.createAndSaveRecipe);

router.route('/').get(recipeController.getRecipes);

router.route('/').delete(recipeController.deleteRecipe);


module.exports = router;
