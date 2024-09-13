const express = require("express");
const router  = express.Router();
const controller = require('../controller/userPasswordController.js');

router.route('/').put(function(req,res) {
  controller.updateUserPassword(req, res);
});

module.exports = router;