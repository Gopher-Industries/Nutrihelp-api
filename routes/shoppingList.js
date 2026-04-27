const express = require('express');
const { coreApp } = require('../controller');
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

const router = express.Router();
const { shoppingList: controller } = coreApp;

// Planning helpers
router.get(
  '/ingredient-options',
  getIngredientOptionsValidation,
  validate,
  controller.getIngredientOptions
);

router.post(
  '/from-meal-plan',
  generateFromMealPlanValidation,
  validate,
  controller.generateFromMealPlan
);

// Shopping list collection
router.route('/')
  .post(createShoppingListValidation, validate, controller.createShoppingList)
  .get(getShoppingListValidation, validate, controller.getShoppingList);

// Shopping list items
router.post('/items', addShoppingListItemValidation, validate, controller.addShoppingListItem);

router.route('/items/:id')
  .patch(updateShoppingListItemValidation, validate, controller.updateShoppingListItem)
  .delete(deleteShoppingListItemValidation, validate, controller.deleteShoppingListItem);

module.exports = router;
