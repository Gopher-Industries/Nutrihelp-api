const express = require('express');
const router = express.Router();
const { updateWaterIntake } = require('../controller/waterIntakeController');

router.post('/', updateWaterIntake);
console.log("Water Intake Route Loaded");

module.exports = router;
