const Joi = require('joi');

// id can be UUID or integer-like string/number
const idSchema = Joi.alternatives().try(
  Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }),
  Joi.number().integer().positive(),
  Joi.string().regex(/^\d+$/) // numeric id as string
);

const querySchema = Joi.object({
  id: idSchema.optional(),
  title: Joi.string().max(300).optional(),
  content: Joi.string().optional(),
  author_name: Joi.string().max(200).optional(),
  category_name: Joi.string().max(200).optional(),
  tag_name: Joi.string().max(200).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  sort_by: Joi.string().valid('published_at', 'created_at', 'updated_at', 'title').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  include_details: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true','false')).optional()
});

module.exports = {
  healthNewsQuerySchema: querySchema
};
