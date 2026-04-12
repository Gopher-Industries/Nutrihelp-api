const express = require("express");
const router = express.Router();
const controller = require("../controller/userPreferencesController");
const { authenticateToken } = require("../middleware/authenticateToken");
const authorizeRoles = require("../middleware/authorizeRoles");
const {
  validateUserPreferences,
  validateHealthContext,
  validateNotificationPreferences,
} = require("../validators/userPreferencesValidator");
const ValidateRequest = require("../middleware/validateRequest");

// GET /api/user/preferences — Admin only (all users list)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  controller.getUserPreferences
);

// POST /api/user/preferences — Any logged-in user updates own flat food preferences
router.post(
  "/",
  authenticateToken,
  validateUserPreferences,
  ValidateRequest,
  controller.postUserPreferences
);

// GET /api/user/preferences/extended — Logged-in user reads own full health-context + food prefs
router.get(
  "/extended",
  authenticateToken,
  controller.getExtendedUserPreferences
);

// PUT /api/user/preferences/extended — Logged-in user updates own health-context
router.put(
  "/extended",
  authenticateToken,
  validateHealthContext,
  ValidateRequest,
  controller.updateExtendedUserPreferences
);

// GET /api/user/preferences/extended/notifications — Logged-in user reads notification prefs
router.get(
  "/extended/notifications",
  authenticateToken,
  controller.getNotificationPreferences
);

// PUT /api/user/preferences/extended/notifications — Logged-in user updates notification prefs
router.put(
  "/extended/notifications",
  authenticateToken,
  validateNotificationPreferences,
  ValidateRequest,
  controller.updateNotificationPreferences
);

module.exports = router;
