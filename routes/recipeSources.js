const express = require('express');
const router = express.Router();
const recipeSourcesController = require('../controller/recipeSourcesController');
const { authenticateToken } = require('../middleware/authenticateToken');
const validate = require('../middleware/validate');
const { recipeSourcesSearchQuery, recipeSourcesMapBody } = require('../validators/schemas');

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

module.exports = router;
