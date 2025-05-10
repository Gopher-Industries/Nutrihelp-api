const express = require("express");
const router = express.Router();
const controller = require('../controller/userFeedbackController');
const { feedbackValidation } = require('../validators/feedbackValidator.js');
const validate = require('../middleware/validateRequest.js');
const { formLimiter } = require('../middleware/rateLimiter'); // ✅ rate limiter added

router.post('/', formLimiter, feedbackValidation, validate, (req, res) => {
    controller.userfeedback(req, res);
});

module.exports = router;
