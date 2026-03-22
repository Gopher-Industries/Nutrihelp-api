const express = require("express");
const router = express.Router();
const controller = require('../controller/loginController.js');

// Import validation rules and middleware
const { loginValidator, mfaloginValidator } = require('../validators/loginValidator');
const validate = require('../middleware/validateRequest');
const { loginLimiter } = require('../middleware/rateLimiter'); // ✅ rate limiter added

// POST /login
router.post('/', loginLimiter, loginValidator, validate, controller.login);

// POST /login/mfa
router.post('/mfa', loginLimiter, mfaloginValidator, validate, controller.loginMfa);

module.exports = router;
