const express = require('express');
const router = express.Router();
const recipeController = require('../controller/recipeController.js');

router.route('/createRecipe').post(recipeController.createAndSaveRecipe);

router.route('/').post(recipeController.getRecipes);

router.route('/').delete(recipeController.deleteRecipe);


module.exports = router;
