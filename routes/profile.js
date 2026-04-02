const express = require("express");
const router = express.Router();
const controller = require("../controller/userProfileController.js");
const { authenticateToken } = require("../middleware/authenticateToken");

router.get("/", authenticateToken, (req, res) => {
  req.params.userId = req.user.userId;
  return controller.getUserProfile(req, res);
});

router.put("/", authenticateToken, (req, res) => {
  req.body.user_id = req.body.user_id || req.user.userId;
  if (String(req.user.userId) !== String(req.body.user_id) && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: You can only update your own profile",
    });
  }

  return controller.updateUserProfile(req, res);
});

module.exports = router;
