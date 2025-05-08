const { body } = require("express-validator");

exports.validateUserPreferences = [
  // Validate user object and userId
  body('user')
    .notEmpty().withMessage('User object is required')
    .isObject().withMessage('User must be an object'),

  body('user.userId')
    .notEmpty().withMessage('User ID is required')
    .isInt().withMessage('User ID must be an integer'),

  // Optional: dietary restrictions should be an array of strings
  body('dietary_restrictions')
    .optional()
    .isArray().withMessage('Dietary restrictions must be an array of strings')
    .custom((arr) => arr.every(item => typeof item === 'string')).withMessage('Each dietary restriction must be a string'),

  // Optional: cuisine preferences should be an array of strings
  body('cuisine_preferences')
    .optional()
    .isArray().withMessage('Cuisine preferences must be an array of strings')
    .custom((arr) => arr.every(item => typeof item === 'string')).withMessage('Each cuisine preference must be a string'),

  // Optional: allergens should be an array of strings
  body('allergens')
    .optional()
    .isArray().withMessage('Allergens must be an array of strings')
    .custom((arr) => arr.every(item => typeof item === 'string')).withMessage('Each allergen must be a string'),

  // Optional: goal should be a string
  body('goal')
    .optional()
    .isString().withMessage('Goal must be a string'),
];
