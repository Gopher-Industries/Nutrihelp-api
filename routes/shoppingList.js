const express = require('express');
const router = express.Router();
const { coreApp } = require('../controller');
const { authenticateToken } = require('../middleware/authenticateToken');
const {
  getIngredientOptionsValidation,
  generateFromMealPlanValidation,
  createShoppingListValidation,
  getShoppingListValidation,
  addShoppingListItemValidation,
  updateShoppingListItemValidation,
  deleteShoppingListItemValidation
} = require('../validators/shoppingListValidator.js');
const validate = require('../middleware/validateRequest.js');

const controller = coreApp.shoppingList;

// Planning helpers
router.get('/ingredient-options', authenticateToken, getIngredientOptionsValidation, validate, controller.getIngredientOptions);
router.post('/from-meal-plan', authenticateToken, generateFromMealPlanValidation, validate, controller.generateFromMealPlan);

// Shopping list collection
router.route('/')
  .post(authenticateToken, createShoppingListValidation, validate, controller.createShoppingList)
  .get(authenticateToken, getShoppingListValidation, validate, controller.getShoppingList);

// Shopping list items
router.post('/items', authenticateToken, addShoppingListItemValidation, validate, controller.addShoppingListItem);

router.route('/items/:id')
  .patch(authenticateToken, updateShoppingListItemValidation, validate, controller.updateShoppingListItem)
  .delete(authenticateToken, deleteShoppingListItemValidation, validate, controller.deleteShoppingListItem);

module.exports = router;
