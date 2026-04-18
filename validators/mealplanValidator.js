const { body } = require('express-validator');

// Validation for adding a meal plan
const addMealPlanValidation = [
    body('recipe_ids')
        .notEmpty()
        .withMessage('Recipe IDs are required')
        .isArray()
        .withMessage('Recipe IDs must be an array'),

    body('meal_type')
        .notEmpty()
        .withMessage('Meal Type is required')
        .isString()
        .withMessage('Meal Type must be a string'),

    body('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .isInt()
        .withMessage('User ID must be an integer')
];

// Validation for getting a meal plan
const getMealPlanValidation = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .isInt()
        .withMessage('User ID must be an integer')
];

// Validation for deleting a meal plan
const deleteMealPlanValidation = [
    body('id')
        .notEmpty()
        .withMessage('Plan ID is required')
        .isInt()
        .withMessage('Plan ID must be an integer'),

    body('user_id')
        .notEmpty()
        .withMessage('User ID is required')
        .isInt()
        .withMessage('User ID must be an integer')
];

module.exports = {
    addMealPlanValidation,
    getMealPlanValidation,
    deleteMealPlanValidation
};
