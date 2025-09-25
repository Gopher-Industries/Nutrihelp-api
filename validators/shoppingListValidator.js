const { body, query, param } = require('express-validator');

// Validation for ingredient search API
const getIngredientOptionsValidation = [
    query('name')
        .notEmpty()
        .withMessage('Ingredient name cannot be empty')
        .isLength({ min: 1, max: 100 })
        .withMessage('Ingredient name length must be between 1-100 characters')
];

// Validation for generating shopping list from meal plan
const generateFromMealPlanValidation = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('meal_plan_ids')
        .isArray({ min: 1 })
        .withMessage('Meal plan IDs must be an array with at least one element')
        .custom((value) => {
            return value.every(id => Number.isInteger(id) && id > 0);
        })
        .withMessage('All meal plan IDs must be positive integers')
];

// Validation for creating shopping list
const createShoppingListValidation = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('name')
        .notEmpty()
        .withMessage('Shopping list name cannot be empty')
        .isLength({ min: 1, max: 255 })
        .withMessage('Shopping list name length must be between 1-255 characters'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('Items array cannot be empty and must contain at least one element'),
    body('items.*.ingredient_name')
        .notEmpty()
        .withMessage('Ingredient name cannot be empty'),
    body('items.*.quantity')
        .notEmpty()
        .withMessage('Quantity cannot be empty')
        .isFloat({ min: 0.01 })
        .withMessage('Quantity must be a number greater than 0'),
    body('items.*.unit')
        .notEmpty()
        .withMessage('Unit cannot be empty'),
    body('items.*.measurement')
        .notEmpty()
        .withMessage('Measurement cannot be empty')
];

// Validation for getting shopping list
const getShoppingListValidation = [
    query('user_id')
        .notEmpty()
        .withMessage('User ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer')
];

// Validation for adding shopping list item
const addShoppingListItemValidation = [
    body('shopping_list_id')
        .notEmpty()
        .withMessage('Shopping list ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Shopping list ID must be a positive integer'),
    body('ingredient_name')
        .notEmpty()
        .withMessage('Ingredient name cannot be empty')
        .isLength({ min: 1, max: 255 })
        .withMessage('Ingredient name length must be between 1-255 characters'),
    body('category')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Category length cannot exceed 100 characters'),
    body('quantity')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Quantity must be a number greater than 0'),
    body('unit')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Unit length cannot exceed 50 characters'),
    body('measurement')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Measurement length cannot exceed 50 characters'),
    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes length cannot exceed 1000 characters'),
    body('meal_tags')
        .optional()
        .isArray()
        .withMessage('Meal tags must be an array'),
    body('estimated_cost')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Estimated cost must be a non-negative number')
];

// Validation for updating shopping list item
const updateShoppingListItemValidation = [
    param('id')
        .notEmpty()
        .withMessage('Item ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Item ID must be a positive integer'),
    body('purchased')
        .optional()
        .isBoolean()
        .withMessage('Purchased field must be a boolean value'),
    body('quantity')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Quantity must be a number greater than 0'),
    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes length cannot exceed 1000 characters')
];

// Validation for deleting shopping list item
const deleteShoppingListItemValidation = [
    param('id')
        .notEmpty()
        .withMessage('Item ID cannot be empty')
        .isInt({ min: 1 })
        .withMessage('Item ID must be a positive integer')
];

module.exports = {
    getIngredientOptionsValidation,
    generateFromMealPlanValidation,
    createShoppingListValidation,
    getShoppingListValidation,
    addShoppingListItemValidation,
    updateShoppingListItemValidation,
    deleteShoppingListItemValidation
};
