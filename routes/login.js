const express = require("express");
const router = express.Router();
const controller = require('../controller/loginController.js');

router.route('/').post(function(req,res) {
    controller.login(req, res);
});
router.route('/mfa').post(function(req,res) {
    controller.loginMfa(req, res);
});
module.exports = router;