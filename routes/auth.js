const express = require('express');
const router = express.Router();

const authController = require('../controller/authController');

// ⬅️ Existing route
router.post('/log-login-attempt', authController.logLoginAttempt);

// ✅ New route for email verification request
router.post('/request-email-verification', authController.requestEmailVerification);

router.get('/__ping', (req, res) => res.json({ ok: true, route: 'auth' }));

module.exports = router;
