const { body } = require('express-validator');

// Helper to validate that an array only contains integers
const isArrayOfIntegers = (value) => {
  return Array.isArray(value) && value.every(Number.isInteger);
};

exports.validateUserPreferences = [
  body('user')
    .notEmpty().withMessage('User object is required')
    .isObject().withMessage('User must be an object'),

  body('user.userId')
    .notEmpty().withMessage('User ID is required')
    .isInt().withMessage('User ID must be an integer'),

  body('dietary_requirements')
    .optional()
    .custom(isArrayOfIntegers).withMessage('Dietary requirements must be an array of integers'),

  body('allergies')
    .optional()
    .custom(isArrayOfIntegers).withMessage('Allergies must be an array of integers'),

  body('cuisines')
    .optional()
    .custom(isArrayOfIntegers).withMessage('Cuisines must be an array of integers'),

  body('dislikes')
    .optional()
    .custom(isArrayOfIntegers).withMessage('Dislikes must be an array of integers'),

  body('health_conditions')
    .optional()
    .custom(isArrayOfIntegers).withMessage('Health conditions must be an array of integers'),

  body('spice_levels')
    .optional()
    .custom(isArrayOfIntegers).withMessage('Spice levels must be an array of integers'),

  body('cooking_methods')
    .optional()
    .custom(isArrayOfIntegers).withMessage('Cooking methods must be an array of integers'),
];
