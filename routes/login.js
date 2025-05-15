const express = require("express");
const router = express.Router();
const controller = require('../controller/loginController.js');

// Import validation rules and middleware
const { loginValidator, mfaloginValidator } = require('../validators/loginValidator');
const validate = require('../middleware/validateRequest');
const { loginLimiter } = require('../middleware/rateLimiter'); // ✅ rate limiter added

// POST /login
router.post('/', loginLimiter, loginValidator, validate, (req, res) => {
    controller.login(req, res);
});

// POST /login/mfa
router.post('/mfa', loginLimiter, mfaloginValidator, validate, (req, res) => {
    controller.loginMfa(req, res);
});

module.exports = router;
