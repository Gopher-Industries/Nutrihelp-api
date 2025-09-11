const express = require("express");
const router = express.Router();
const controller = require('../controller/shoppingListController.js');
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

// Ingredient search endpoint - GET /api/shopping-list/ingredient-options
// Search ingredients by name and return price, store, and package information
router.get('/ingredient-options', 
    getIngredientOptionsValidation, 
    validate, 
    controller.getIngredientOptions
);

// Generate shopping list from meal plan endpoint - POST /api/shopping-list/from-meal-plan
// Merge ingredient needs from selected meals and return aggregated quantities
router.post('/from-meal-plan', 
    generateFromMealPlanValidation, 
    validate, 
    controller.generateFromMealPlan
);

// Shopping list CRUD operations
router.route('/')
    .post(createShoppingListValidation, validate, controller.createShoppingList)  // Create shopping list
    .get(getShoppingListValidation, validate, controller.getShoppingList);        // Get user's shopping lists

// Shopping list item operations
router.post('/items', addShoppingListItemValidation, validate, controller.addShoppingListItem);  // Add new item
router.route('/items/:id')
    .patch(updateShoppingListItemValidation, validate, controller.updateShoppingListItem)  // Update item status
    .delete(deleteShoppingListItemValidation, validate, controller.deleteShoppingListItem); // Delete item

module.exports = router;
