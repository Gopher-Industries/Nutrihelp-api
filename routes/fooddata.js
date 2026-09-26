const express = require('express');
const router = express.Router();
const foodDatabaseController = require('../controller/foodDatabaseController');
const foodDataController = require('../controller/foodDataController');
const validate = require('../middleware/validate');
const { foodSearchQuery } = require('../validators/schemas');

router.get('/search', validate(foodSearchQuery, 'query'), foodDatabaseController.searchFood);
router.get('/dietaryrequirements', foodDataController.getAllDietaryRequirements);
router.get('/cuisines', foodDataController.getAllCuisines);
router.get('/allergies', foodDataController.getAllAllergies);
router.get('/ingredients', foodDataController.getAllIngredients);
router.get('/cookingmethods', foodDataController.getAllCookingMethods);
router.get('/spicelevels', foodDataController.getAllSpiceLevels);
router.get('/healthconditions', foodDataController.getAllHealthConditions);

module.exports = router;
