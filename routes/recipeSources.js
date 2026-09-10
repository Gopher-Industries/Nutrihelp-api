const express = require('express');
const router = express.Router();
const recipeSourcesController = require('../controller/recipeSourcesController');
const { authenticateToken } = require('../middleware/authenticateToken');
const validate = require('../middleware/validate');
const {
  recipeSourcesSearchQuery,
  recipeSourcesMapBody,
  recipeSourcesResolveIngredientsBody,
} = require('../validators/schemas');

router.get(
  '/search',
  authenticateToken,
  validate(recipeSourcesSearchQuery, 'query'),
  recipeSourcesController.searchSources
);

router.post(
  '/map',
  authenticateToken,
  validate(recipeSourcesMapBody, 'body'),
  recipeSourcesController.mapSource
);

// Called when the user saves a prefilled recipe, not when they preview one:
// this is the only path allowed to create ingredients.
router.post(
  '/resolve-ingredients',
  authenticateToken,
  validate(recipeSourcesResolveIngredientsBody, 'body'),
  recipeSourcesController.resolveIngredientsForSave
);

module.exports = router;
