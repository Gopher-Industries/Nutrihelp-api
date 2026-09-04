const express = require('express');
const router = express.Router();

const {
  getSecurityDashboard,
} = require('../controller/securityDashboardController');

// GET /security-dashboard
router.get('/', getSecurityDashboard);

module.exports = router;