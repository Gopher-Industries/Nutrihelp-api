/**
 * validators/foodValidators.js
 * validations for food / nutrition endpoints
 */
const { query, param, body } = require('express-validator');

const nutritionByName = [
  // Accept name as query or body
  query('name').optional().isString().trim().notEmpty().withMessage('name must be a non-empty string'),
  body('name').optional().isString().trim().notEmpty().withMessage('name must be a non-empty string'),
];

module.exports = { nutritionByName };
