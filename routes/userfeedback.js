const express = require("express");
const router = express.Router();
const { contentAndSupport } = require('../controller');
const { feedbackValidation } = require('../validators/feedbackValidator.js');
const validate = require('../middleware/validateRequest.js');
const { formLimiter } = require('../middleware/rateLimiter'); // ✅ rate limiter added

const { feedback: controller } = contentAndSupport;

router.post('/', formLimiter, feedbackValidation, validate, (req, res) => {
    controller.userfeedback(req, res);
});

module.exports = router;
