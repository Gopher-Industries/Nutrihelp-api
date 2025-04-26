const express = require("express");
const router = express.Router();
const controller = require("../controller/signupController.js");
const { signupLimiter } = require("../middleware/rateLimiter");

router.route('/')
    .post(signupLimiter, function(req, res) {
        controller.signup(req, res);
    });

module.exports = router;