const Joi = require('joi');

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

module.exports = { recipeSchema, getRecipesSchema };
