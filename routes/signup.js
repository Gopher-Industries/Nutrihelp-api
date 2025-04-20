const express = require("express");
const router = express.Router();
const controller = require('../controller/signupController.js');

// Import the validation rule and middleware
const { registerValidation } = require('../validators/signupValidator.js');
const validate = require('../middleware/validateRequest');

// Apply validation before the controller
router.route('/').post(registerValidation, validate, (req, res) => {
    controller.signup(req, res);
});

module.exports = router;
