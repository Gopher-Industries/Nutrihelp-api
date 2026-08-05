// const express = require("express");
// const router = express.Router();
// const controller = require('../controller/signupController.js');

// // Import the validation rule and middleware
// const { registerValidation } = require('../validators/signupValidator.js');
// const validate = require('../middleware/validateRequest');
// const { signupLimiter } = require('../middleware/rateLimiter'); // rate limiter added

// // Apply rate limiter and validation before the controller
// router.post('/', signupLimiter, registerValidation, validate, controller.signup);

// module.exports = router;
const express = require("express");
const router = express.Router();
const controller = require('../controller/signupController.js');

// Import the validation rule and middleware
const { registerValidation } = require('../validators/signupValidator.js');
const validate = require('../middleware/validateRequest');
const sanitizeInput = require('../middleware/sanitizeInput');
const { signupLimiter } = require('../middleware/rateLimiter'); // rate limiter added

// Apply rate limiter and validation before the controller
router.post(
  '/',
  signupLimiter,
  sanitizeInput,
  registerValidation,
  validate,
  controller.signup
);

module.exports = router;