const express = require('express');
const router = express.Router();

const authController = require('../controller/authController');

// ⬅️ Existing route
router.post('/log-login-attempt', authController.logLoginAttempt);

// ✅ New route for email verification request
router.post('/request-email-verification', authController.requestEmailVerification);

module.exports = router;
