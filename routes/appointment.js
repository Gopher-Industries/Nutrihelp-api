const express = require('express');
const router = express.Router();
const appointmentController = require('../controller/appointmentController.js');

// POST route for /api/appointments to save appointment data
router.route('/').post(appointmentController.saveAppointment);

// GET route for /api/appointments to retrieve all appointment data
router.route('/').get(appointmentController.getAppointments);

module.exports = router;
