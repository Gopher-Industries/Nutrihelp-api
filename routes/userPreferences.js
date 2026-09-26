const express = require("express");
const router = express.Router();
const controller = require("../controller/userPreferencesController");
const { authenticateToken } = require("../middleware/authenticateToken");
const {
  validateUserPreferences,
  validateExtendedUserPreferences,
  validateNotificationPreferences,
  validateUiSettings,
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

// PUT /api/user/preferences/extended — authenticated user updates canonical preferences payload
router.put(
  "/extended",
  authenticateToken,
  validateExtendedUserPreferences,
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

// GET /api/user/preferences/extended/ui-settings — authenticated user reads ui settings
router.get(
  "/extended/ui-settings",
  authenticateToken,
  controller.getUiSettings
);

// PUT /api/user/preferences/extended/ui-settings — authenticated user updates ui settings
router.put(
  "/extended/ui-settings",
  authenticateToken,
  validateUiSettings,
  ValidateRequest,
  controller.updateUiSettings
);

module.exports = router;
