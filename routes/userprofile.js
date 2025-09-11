const express = require("express");
const router  = express.Router();
const controller = require('../controller/userProfileController.js');
const updateUserProfileController = require('../controller/updateUserProfileController.js');

router.route('/').put(function(req,res) {
  controller.updateUserProfile(req, res);
});

router.route('/').get(function(req,res) {
  controller.getUserProfile(req, res);
});

router.put('/update-by-identifier', updateUserProfileController.updateUserProfile);

module.exports = router;