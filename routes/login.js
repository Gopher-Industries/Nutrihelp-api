const express = require("express");
const router = express.Router();
const controller = require('../controller/loginController.js');

// Import validation rules and middleware
const { loginValidator, mfaloginValidator } = require('../validators/loginValidator');
const validate = require('../middleware/validateRequest');

// POST /login
router.route('/').post(loginValidator, validate, (req, res) => {
    controller.login(req, res);
});

// POST /login/mfa
router.route('/mfa').post(mfaloginValidator, validate, (req, res) => {
    controller.loginMfa(req, res);
});

module.exports = router;
