const { body } = require('express-validator');

const validateRecipe = [
  body('user_id')
    .notEmpty().withMessage('User ID is required')
    .isInt().withMessage('User ID must be an integer'),

  body('ingredient_id')
    .isArray({ min: 1 }).withMessage('Ingredient IDs must be a non-empty array'),

  body('ingredient_quantity')
    .isArray({ min: 1 }).withMessage('Ingredient quantities must be a non-empty array'),

  body('recipe_name')
    .notEmpty().withMessage('Recipe name is required')
    .isString().withMessage('Recipe name must be a string'),

  body('cuisine_id')
    .notEmpty().withMessage('Cuisine ID is required')
    .isInt().withMessage('Cuisine ID must be an integer'),

  body('total_servings')
    .notEmpty().withMessage('Total servings is required')
    .isInt().withMessage('Total servings must be an integer'),

  body('preparation_time')
    .notEmpty().withMessage('Preparation time is required')
    .isInt().withMessage('Preparation time must be an integer'),

  body('instructions')
    .notEmpty().withMessage('Instructions are required')
    .isString().withMessage('Instructions must be a string'),

  body('recipe_image')
    .optional()
    .isString().withMessage('Recipe image must be a string if provided'),

  body('cooking_method_id')
    .notEmpty().withMessage('Cooking method ID is required')
    .isInt().withMessage('Cooking method ID must be an integer'),
];

module.exports = {
    validateRecipe
};
