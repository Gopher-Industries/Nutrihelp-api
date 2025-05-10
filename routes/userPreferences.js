const express           = require("express");
const router            = express.Router();
const controller        = require("../controller/userPreferencesController");
const authenticateToken = require("../middleware/authenticateToken");
const { validateUserPreferences } = require("../validators/userPreferencesValidator");
const ValidateRequest = require("../middleware/validateRequest");

router.route("/").get(authenticateToken, controller.getUserPreferences);
router.post(
    "/",
    authenticateToken,
    validateUserPreferences,
    ValidateRequest,
    controller.postUserPreferences
  );

module.exports = router;