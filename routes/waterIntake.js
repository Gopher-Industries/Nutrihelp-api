const express = require('express');
const router = express.Router();
const { updateWaterIntake } = require('../controller/waterIntakeController');

router.post('/', updateWaterIntake);

module.exports = router;
