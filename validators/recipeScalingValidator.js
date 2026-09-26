const Joi = require('joi');

const scaleRecipeParams = Joi.object({
  recipe_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().uuid()).required(),
  desired_servings: Joi.number().integer().min(1).required()
});

module.exports = { scaleRecipeParams };
