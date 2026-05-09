const Joi = require('joi');
const { body } = require('express-validator');

const recipeSchema = Joi.object({
  user_id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  recipe_name: Joi.string().required(),
  cuisine_id: Joi.number().optional(),
  total_servings: Joi.number().min(1).required(),
  preparation_time: Joi.number().min(1).required(),
  instructions: Joi.string().required(),
  ingredient_id: Joi.array().items(Joi.number()).required(),
  ingredient_quantity: Joi.array().items(Joi.number()).required(),
  recipe_image: Joi.string().optional().allow(null, ''),
  cooking_method_id: Joi.number().optional()
});

const getRecipesSchema = Joi.object({
  user_id: Joi.alternatives().try(Joi.number(), Joi.string()).required()
});

const validateRecipe = [
  body('user_id').notEmpty().withMessage('user_id is required'),
  body('recipe_name').notEmpty().withMessage('recipe_name is required'),
  body('total_servings').isInt({ min: 1 }).withMessage('total_servings must be at least 1'),
  body('preparation_time').isInt({ min: 1 }).withMessage('preparation_time must be at least 1'),
  body('instructions').notEmpty().withMessage('instructions is required'),
  body('ingredient_id').isArray().withMessage('ingredient_id must be an array'),
  body('ingredient_quantity').isArray().withMessage('ingredient_quantity must be an array'),
];

module.exports = { recipeSchema, getRecipesSchema, validateRecipe };
