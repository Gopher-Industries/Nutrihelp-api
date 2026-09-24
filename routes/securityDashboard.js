const express = require('express');
const router = express.Router();

const {
  getSecurityDashboard,
} = require('../controller/securityDashboardController');

const { authenticateToken } = require('../middleware/authenticateToken');

// GET /security-dashboard
router.get('/', authenticateToken, getSecurityDashboard);

module.exports = router;