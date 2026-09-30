const Joi = require('joi');
const { body } = require('express-validator');

const recipeSchema = Joi.object({
  user_id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
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
  user_id: Joi.alternatives().try(Joi.number(), Joi.string()).optional()
});

const validateRecipe = [
  body('user_id').optional(),
  body('recipe_name').notEmpty().withMessage('recipe_name is required'),
  body('total_servings').isInt({ min: 1 }).withMessage('total_servings must be at least 1'),
  body('preparation_time').isInt({ min: 1 }).withMessage('preparation_time must be at least 1'),
  body('instructions').notEmpty().withMessage('instructions is required'),
  body('ingredient_id').isArray().withMessage('ingredient_id must be an array'),
  body('ingredient_quantity').isArray().withMessage('ingredient_quantity must be an array'),
  body('ingredient_id').isArray({ min: 1 }),
  body('ingredient_id.*').isInt({ min: 1 }),
  body('ingredient_quantity').custom((values, { req }) => Array.isArray(values) && values.length === req.body.ingredient_id?.length),
  body('ingredient_quantity.*').optional({ nullable: true }).isFloat({ gt: 0 }),
  ...['ingredient_unit', 'ingredient_notes', 'ingredient_source_measure', 'ingredient_grams_source'].flatMap(field => [
    body(field).optional().isArray().custom((values, { req }) => values.length === req.body.ingredient_id?.length),
    body(`${field}.*`).optional({ nullable: true }).isString().isLength({ max: 500 }),
  ]),
  // Weight of each ingredient in grams, worked out by /recipe-sources/resolve-ingredients.
  // null means unknown, 0 means negligible (a pinch). 100 kg is far beyond any
  // home recipe and catches a gram/kilogram mix-up before it reaches the totals.
  body('ingredient_grams').optional().isArray().custom((values, { req }) => values.length === req.body.ingredient_id?.length),
  body('ingredient_grams.*').optional({ nullable: true }).isFloat({ min: 0, max: 100000 }),
];

module.exports = { recipeSchema, getRecipesSchema, validateRecipe };
