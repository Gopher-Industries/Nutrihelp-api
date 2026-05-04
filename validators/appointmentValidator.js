const Joi = require('joi');

const idSchema = Joi.alternatives().try(
  Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }),
  Joi.number().integer().positive(),
  Joi.string().regex(/^\d+$/)
);

const createAppointmentBody = Joi.object({
  user_id: idSchema.required(),
  title: Joi.string().max(255).required(),
  doctor: Joi.string().allow(null, '').optional(),
  type: Joi.string().allow(null, '').optional(),
  date: Joi.date().iso().required(),
  time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).required(), // HH:MM or HH:MM:SS
  location: Joi.string().allow(null, '').optional(),
  address: Joi.string().allow(null, '').optional(),
  phone: Joi.string().allow(null, '').optional(),
  notes: Joi.string().allow(null, '').optional(),
  reminder: Joi.string().allow(null, '').optional(),
  description: Joi.string().allow(null, '').optional()
});

const getAppointmentsQuery = Joi.object({
  user_id: idSchema.required(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional()
});

module.exports = {
  createAppointmentBody,
  getAppointmentsQuery
};
