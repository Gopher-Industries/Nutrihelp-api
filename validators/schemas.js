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
  })
};

module.exports = schemas;
