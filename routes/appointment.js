const express = require('express');
const router = express.Router();

const { coreApp } = require('../controller');
const { createAppointment: appointmentValidator } = require('../validators/appointmentValidators.js');
const validate = require('../middleware/validateRequest.js');

const { appointments: appointmentController } = coreApp;

// Legacy appointment routes
router.route('/')
  .post(appointmentValidator, validate, appointmentController.saveAppointment)
  .get(appointmentController.getAppointments);

// Structured appointment routes used by newer clients
router.route('/v2')
  .post(appointmentValidator, validate, appointmentController.saveAppointmentV2)
  .get(appointmentController.getAppointmentsV2);

router.route('/v2/:id')
  .put(appointmentValidator, validate, appointmentController.updateAppointment)
  .delete(appointmentController.delAppointment);

module.exports = router;
