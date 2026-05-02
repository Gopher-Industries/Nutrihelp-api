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
  })
};

module.exports = schemas;
