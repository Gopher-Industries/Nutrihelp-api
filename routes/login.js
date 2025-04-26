const express = require("express");
const router = express.Router();
const controller = require("../controller/loginController.js");
const { loginLimiter } = require("../middleware/rateLimiter");

router.route('/')
    .post(loginLimiter, function(req, res) {
        controller.login(req, res);
    });

router.route('/mfa')
    .post(loginLimiter, function(req, res) {
        controller.loginMfa(req, res);
    });

module.exports = router;