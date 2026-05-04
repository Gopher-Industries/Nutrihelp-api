const Joi = require('joi');

const getRecipeNutritionQuery = Joi.object({
  name: Joi.string().trim().min(1).required()
});

module.exports = { getRecipeNutritionQuery };
