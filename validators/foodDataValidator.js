const Joi = require('joi');

const idSchema = Joi.alternatives().try(
  Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }),
  Joi.number().integer().positive(),
  Joi.string().regex(/^\d+$/)
);

const mealplanQuery = Joi.object({
  user_id: idSchema.optional(),   // allow numeric id or UUID
  date: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional()
});

module.exports = {
  mealplanQuerySchema: mealplanQuery
};
