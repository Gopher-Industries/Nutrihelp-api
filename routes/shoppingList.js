const express = require('express');
const router = express.Router();
const controller = require('../controller/shoppingController');
const validate = require('../middleware/validate');
const { shoppingItem } = require('../validators/utilitySchemas');

// GET all items for a user
router.get('/:user_id', controller.getUserList);

// POST new item
router.post('/', validate(shoppingItem, 'body'), controller.addItem);

// DELETE item
router.delete('/:id', controller.removeItem);
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
