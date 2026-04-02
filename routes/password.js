const express = require("express");
const router = express.Router();
const controller = require("../controller/passwordController");

router.post("/request-reset", (req, res) => {
  controller.requestReset(req, res);
});

router.post("/verify-code", (req, res) => {
  controller.verifyCode(req, res);
});

router.post("/reset", (req, res) => {
  controller.resetPassword(req, res);
});

module.exports = router;
