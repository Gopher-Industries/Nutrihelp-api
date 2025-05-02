const express = require("express");
const router  = express.Router();
const controller = require('../controller/userFeedbackController');
const { feedbackValidation } = require('../validators/feedbackValidator.js');
const validate = require('../middleware/validateRequest.js');

router.route('/').post(feedbackValidation, validate, (req,res) => {
    controller.userfeedback(req, res);
});

module.exports = router;