const express = require("express");
const router  = express.Router();
const controller = require('../controller/userProfileController.js');

router.route('/').post(function(req,res) {
    controller.userProfile(req, res);
});

module.exports = router;