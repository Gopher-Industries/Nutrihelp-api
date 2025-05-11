const express           = require("express");
const router            = express.Router();
const controller        = require("../controller/userPreferencesController");
const authenticateToken = require("../middleware/authenticateToken");
const { validateUserPreferences } = require("../validators/userPreferencesValidator");
const ValidateRequest = require("../middleware/ValidateRequest");

router.route("/").get(authenticateToken, controller.getUserPreferences);
// router.route("/").post(authenticateToken, controller.postUserPreferences);
router.post(
    "/",
    authenticateToken,
    validateUserPreferences,
    ValidateRequest,
    controller.postUserPreferences
  );

module.exports = router;