const express = require("express");
const router  = express.Router();
const controller = require('../controller/userPasswordController.js');
const { authenticateToken } = require('../middleware/authenticateToken');
const { passwordChangeLimiter } = require('../middleware/rateLimiter');

router.post(
  '/verify',
  authenticateToken,
  passwordChangeLimiter,
  function(req, res) {
    controller.verifyCurrentPassword(req, res);
  }
);

router.put(
  '/update',
  authenticateToken,
  passwordChangeLimiter,
  function(req, res) {
    controller.updateUserPassword(req, res);
  }
);

router.put(
  '/',
  authenticateToken,
  passwordChangeLimiter,
  function(req, res) {
    controller.updateUserPassword(req, res);
  }
);

module.exports = router;
