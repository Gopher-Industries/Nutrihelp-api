const express = require('express');
const router = express.Router();
const appointmentController = require('../controller/appointmentController.js');
const { appointmentValidator,appointmentValidatorV2 } = require('../validators/appointmentValidator.js');
const validate = require('../middleware/validateRequest.js');
const { appointmentValidation } = require('../validators/appointmentValidator.js');

// POST route for /api/appointments to save appointment data
router.route('/').post(appointmentValidator, validate, appointmentController.saveAppointment);

router.route('/v2').post(appointmentValidatorV2, appointmentValidatorV2, appointmentController.saveAppointmentV2);

router.route('/v2/:id').put(appointmentValidatorV2, validate, appointmentController.updateAppointment);

router.route('/v2/:id').delete(appointmentValidatorV2, appointmentController.delAppointment);

// GET route for /api/appointments to retrieve all appointment data
router.route('/').get(appointmentController.getAppointments);

router.route('/v2').get(appointmentController.getAppointmentsV2);

module.exports = router;