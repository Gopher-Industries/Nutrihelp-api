const express = require("express");
const router = express.Router();
const controller = require("../controller/userPreferencesController");
const { authenticateToken } = require("../middleware/authenticateToken");
const { validateUserPreferences } = require("../validators/userPreferencesValidator");
const ValidateRequest = require("../middleware/validateRequest");

// ✅ GET: Any authenticated user can fetch their own preferences
router
  .route("/")
  .get(
    authenticateToken,
    controller.getUserPreferences
  );

// ✅ POST: Any logged-in user can post their own preferences
router.post(
  "/",
  authenticateToken,
  validateUserPreferences,
  ValidateRequest,
  controller.postUserPreferences
);

module.exports = router;
