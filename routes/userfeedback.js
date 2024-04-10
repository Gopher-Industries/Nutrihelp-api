const express = require("express");
const router  = express.Router();
const controller = require('../controller/userFeedbackController');

router.route('/').post(function(req,res) {
    controller.userfeedback(req, res);
});

module.exports = router;