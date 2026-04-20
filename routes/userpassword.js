const express = require("express");
const router  = express.Router();
const controller = require('../controller/userPasswordController.js');

router.post('/verify', function(req,res) {
  controller.verifyUserPassword(req, res);
});

router.put('/update', function(req,res) {
  controller.updateUserPassword(req, res);
});

router.put('/', function(req,res) {
  controller.updateUserPassword(req, res);
});

module.exports = router;
