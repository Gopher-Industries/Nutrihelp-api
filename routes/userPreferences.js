const express           = require("express");
const router            = express.Router();
const controller        = require("../controller/userPreferencesController");
const authenticateToken = require("../middleware/authenticateToken");

router.route("/").get(authenticateToken, controller.getUserPreferences);
router.route("/").post(authenticateToken, controller.postUserPreferences);

module.exports = router;