/**
 * validators/appointmentValidators.js
 * express-validator chains for appointment routes
 */
const { body, param, query } = require('express-validator');

const createAppointment = [
  body('user_id').exists().withMessage('user_id is required'),
  body('user_id').isInt().withMessage('user_id must be numeric').toInt(),
  body('date').optional().isISO8601().withMessage('date must be ISO8601 (YYYY-MM-DD)'),
  body('time').optional().isString(),
  body('location').optional().isString(),
  body('notes').optional().isString(),
];

const deleteAppointment = [
  body('user_id').exists().withMessage('user_id is required'),
  body('user_id').isInt().withMessage('user_id must be numeric').toInt(),
  body('appointment_id').exists().withMessage('appointment_id is required'),
  body('appointment_id').isInt().withMessage('appointment_id must be numeric').toInt(),
];

const getAppointments = [
  // user_id allowed as query param or header; ensure numeric if present
  query('user_id').optional().isInt().withMessage('user_id must be numeric').toInt(),
];

module.exports = { createAppointment, deleteAppointment, getAppointments };
