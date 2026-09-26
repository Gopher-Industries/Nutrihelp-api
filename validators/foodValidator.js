const Joi = require('joi');

const mealPlanCreate = Joi.object({
  user_id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  date: Joi.string().isoDate().optional(), // accept ISO date string
  meals: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      ingredients: Joi.array().items(
        Joi.object({
          id: Joi.number().required(),
          quantity: Joi.number().required(),
          measurement: Joi.string().optional()
        })
      ).required(),
      servings: Joi.number().optional()
    })
  ).required()
});

module.exports = {
  mealPlanCreate
};
