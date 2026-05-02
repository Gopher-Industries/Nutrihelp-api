const express = require('express');
const router = express.Router();
const controller = require('../controller/appointmentController');
const validate = require('../middleware/validate');
const { appointmentQuery } = require('../validators/schemas');

router.get('/', validate(appointmentQuery, 'query'), controller.getAppointments);

module.exports = router;
