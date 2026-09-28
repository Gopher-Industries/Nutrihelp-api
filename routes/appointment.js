const express = require('express');
const router = express.Router();

const { coreApp } = require('../controller');
const { authenticateToken } = require('../middleware/authenticateToken');
const { createAppointment: appointmentValidator } = require('../validators/appointmentValidators.js');
const validate = require('../middleware/validateRequest.js');

const { appointments: appointmentController } = coreApp;

// Legacy appointment routes
router.route('/')
  .post(authenticateToken, appointmentValidator, validate, appointmentController.saveAppointment)
  .get(authenticateToken, appointmentController.getAppointments);

// Structured appointment routes used by newer clients
router.route('/v2')
  .post(authenticateToken, appointmentValidator, validate, appointmentController.saveAppointmentV2)
  .get(authenticateToken, appointmentController.getAppointmentsV2);

router.route('/v2/:id')
  .put(authenticateToken, appointmentValidator, validate, appointmentController.updateAppointment)
  .delete(authenticateToken, appointmentController.delAppointment);

module.exports = router;
