const express = require("express");
const router = express.Router();
const controller = require('../controller/userFeedbackController.js');
const { formLimiter } = require('../middleware/rateLimiter');

router.post('/', formLimiter, function(req, res) {
    controller.userfeedback(req, res);
});

module.exports = router;