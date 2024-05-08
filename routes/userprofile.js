const express = require("express");
const router  = express.Router();
const controller = require('../controller/userProfileController.js');

router.route('/').put(function(req,res) {
  controller.updateUserProfile(req, res);
});

router.route('/').get(function(req,res) {
  controller.getUserProfile(req, res);
});

module.exports = router;