const { body, query } = require('express-validator');

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
    query('user_id')
        .optional()
        .isInt()
        .withMessage('User ID must be an integer'),

    query('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be a valid ISO-8601 date'),

    query('created_at')
        .optional()
        .isISO8601()
        .withMessage('created_at must be a valid ISO-8601 date'),

    query('meal_type')
        .optional()
        .isString()
        .withMessage('Meal type must be a string')
];

// Validation for deleting a meal plan
const deleteMealPlanValidation = [
    body('id')
        .optional()
        .isInt()
        .withMessage('Plan ID must be an integer'),

    body('meal_plan_id')
        .optional()
        .isInt()
        .withMessage('Meal plan ID must be an integer'),

    body('user_id')
        .optional()
        .isInt()
        .withMessage('User ID must be an integer')
];

module.exports = {
    addMealPlanValidation,
    getMealPlanValidation,
    deleteMealPlanValidation
};
