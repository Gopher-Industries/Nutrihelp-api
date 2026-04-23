const express = require("express");
const router = express.Router();
const controller = require("../controller/userPreferencesController");
const { authenticateToken } = require("../middleware/authenticateToken");
const {
  validateUserPreferences,
  validateHealthContext,
  validateNotificationPreferences,
} = require("../validators/userPreferencesValidator");
const ValidateRequest = require("../middleware/validateRequest");

// GET /api/user/preferences — authenticated user reads own preferences
router.get("/", authenticateToken, controller.getUserPreferences);

// POST /api/user/preferences — authenticated user updates own flat food preferences
router.post(
  "/",
  authenticateToken,
  validateUserPreferences,
  ValidateRequest,
  controller.postUserPreferences
);

// GET /api/user/preferences/extended — authenticated user reads full health-context + food prefs
router.get("/extended", authenticateToken, controller.getExtendedUserPreferences);

// PUT /api/user/preferences/extended — authenticated user updates health-context
router.put(
  "/extended",
  authenticateToken,
  validateHealthContext,
  ValidateRequest,
  controller.updateExtendedUserPreferences
);

// GET /api/user/preferences/extended/notifications — authenticated user reads notification prefs
router.get(
  "/extended/notifications",
  authenticateToken,
  controller.getNotificationPreferences
);

// PUT /api/user/preferences/extended/notifications — authenticated user updates notification prefs
router.put(
  "/extended/notifications",
  authenticateToken,
  validateNotificationPreferences,
  ValidateRequest,
  controller.updateNotificationPreferences
);

module.exports = router;
