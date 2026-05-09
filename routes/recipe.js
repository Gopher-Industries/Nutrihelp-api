const express = require('express');
const router = express.Router();
const recipeController = require('../controller/recipeController.js');
const { validateRecipe } = require('../validators/recipeValidator.js');
const validateRequest = require('../middleware/validateRequest.js');

router.post('/createRecipe', validateRecipe, validateRequest, recipeController.createAndSaveRecipe);

router.get('/user/:user_id', (req, res, next) => {
  req.query.user_id = req.params.user_id;
  next();
}, recipeController.getUserRecipes);

router.get('/:id', recipeController.getRecipeById);
router.post('/', recipeController.getRecipes);
router.delete('/', recipeController.deleteRecipe);

module.exports = router;
