const Joi = require('joi');

const schemas = {
  // Recipes
  recipeQuery: Joi.object({
    user_id: Joi.alternatives().try(Joi.number(), Joi.string().regex(/^\d+$/)).required()
  }),
  
  // Appointments
  appointmentQuery: Joi.object({
    user_id: Joi.alternatives().try(Joi.number(), Joi.string().regex(/^\d+$/)).required()
  }),
  
  // Food Search
  foodSearchQuery: Joi.object({
    query: Joi.string().min(2).max(50).required()
  }),

  // Recipe Sources (external recipe search + mapping)
  recipeSourcesSearchQuery: Joi.object({
    q: Joi.string().trim().min(3).max(80).required()
  }),

  recipeSourcesMapBody: Joi.object({
    source: Joi.string().trim().min(2).max(40).required(),
    external_id: Joi.string().trim().min(1).max(64).required()
  }),

  // Save-time ingredient resolution. This endpoint can INSERT into the shared
  // ingredients table, so the item cap is deliberately tight — a single recipe
  // never legitimately carries more than 30 ingredients.
  recipeSourcesResolveIngredientsBody: Joi.object({
    ingredients: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().min(1).max(120).required(),
          category: Joi.string().trim().max(60).allow('', null)
        })
      )
      .min(1)
      .max(30)
      .required()
  })
};

module.exports = schemas;
