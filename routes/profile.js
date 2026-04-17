const express = require("express");
const router = express.Router();
const controller = require("../controller/userProfileController.js");
const { authenticateToken } = require("../middleware/authenticateToken");
const validate = require("../middleware/validateRequest");
const { updateUserProfileValidation } = require("../validators/userProfileValidator");

router.get("/", authenticateToken, (req, res) => {
  return controller.getUserProfile(req, res);
});

router.put("/", authenticateToken, updateUserProfileValidation, validate, (req, res) => {
  return controller.updateUserProfile(req, res);
});

module.exports = router;
