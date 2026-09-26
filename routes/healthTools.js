const express = require('express');
const router = express.Router();
const controller = require('../controller/healthToolsController');

// GET /api/health-tools          -> catalogue (with optional ?category=)
// GET /api/health-tools/bmi      -> BMI calculator
router.get('/', controller.listTools);
router.get('/bmi', controller.getBmi);

module.exports = router;
