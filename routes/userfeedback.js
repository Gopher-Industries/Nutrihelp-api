const express = require('express');
const router = express.Router();
const { contentAndSupport } = require('../controller');
const { feedbackValidation } = require('../validators/feedbackValidator.js');
const { formLimiter } = require('../middleware/rateLimiter');

const { feedback: controller } = contentAndSupport;

// Controller emits the standardized support envelope; skip legacy validate.
router.post('/', formLimiter, feedbackValidation, (req, res) => {
  controller.userfeedback(req, res);
});

module.exports = router;
