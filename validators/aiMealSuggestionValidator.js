const { body } = require('express-validator');

const addAiMealSuggestionValidation = [
  body('meal_type')
    .notEmpty().withMessage('meal_type is required')
    .isString().withMessage('meal_type must be a string')
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('meal_type must be breakfast, lunch, dinner, or snack'),

  body('name')
    .notEmpty().withMessage('name is required')
    .isString().withMessage('name must be a string')
    .isLength({ max: 255 }).withMessage('name must be 255 characters or fewer'),

  body('day')
    .optional()
    .isString().withMessage('day must be a string'),

  body('description')
    .optional()
    .isString().withMessage('description must be a string'),

  body('calories')
    .optional()
    .isNumeric().withMessage('calories must be a number'),

  body('proteins')
    .optional()
    .isNumeric().withMessage('proteins must be a number'),

  body('fats')
    .optional()
    .isNumeric().withMessage('fats must be a number'),

  body('sodium')
    .optional()
    .isNumeric().withMessage('sodium must be a number'),

  body('fiber')
    .optional()
    .isNumeric().withMessage('fiber must be a number'),

  body('ingredients')
    .optional()
    .isArray().withMessage('ingredients must be an array'),

  body('ingredients.*.item')
    .optional()
    .isString().withMessage('each ingredient item must be a string'),

  body('ingredients.*.amount')
    .optional()
    .isString().withMessage('each ingredient amount must be a string'),
];

const deleteAiMealSuggestionValidation = [
  body('id')
    .notEmpty().withMessage('id is required')
    .isInt({ min: 1 }).withMessage('id must be a positive integer'),
];

module.exports = {
  addAiMealSuggestionValidation,
  deleteAiMealSuggestionValidation,
};
