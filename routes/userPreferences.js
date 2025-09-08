const express = require("express");
const router = express.Router();
const controller = require("../controller/userPreferencesController");
const { authenticateToken } = require("../middleware/authenticateToken");
const authorizeRoles = require("../middleware/authorizeRoles");
const { validateUserPreferences } = require("../validators/userPreferencesValidator");
const ValidateRequest = require("../middleware/validateRequest");

// ✅ GET: Admin-only
router
  .route("/")
  .get(
    authenticateToken,
    authorizeRoles("admin"),  // 👈 RBAC check restored
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