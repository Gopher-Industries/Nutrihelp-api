const express = require('express');
const router = express.Router();
const appointmentController = require('../controller/appointmentController.js');
const { appointmentValidator,appointmentValidatorV2 } = require('../validators/appointmentValidator.js');
const validate = require('../middleware/validateRequest.js');

// POST route for /api/appointments to save appointment data
router.route('/').post(appointmentValidator, validate, appointmentController.saveAppointment);

router.route('/v2').post(appointmentValidatorV2, validate, appointmentController.saveAppointmentV2);

// GET route for /api/appointments to retrieve all appointment data
router.route('/').get(appointmentController.getAppointments);

router.route('/v2').get(appointmentController.getAppointmentsV2);

module.exports = router;