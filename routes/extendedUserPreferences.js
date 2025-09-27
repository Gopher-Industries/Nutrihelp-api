const express = require("express");
const router = express.Router();
const controller = require("../controller/extendedUserPreferencesController");
const { authenticateToken } = require("../middleware/authenticateToken");
const authorizeRoles = require("../middleware/authorizeRoles");
const { validateUserPreferences } = require("../validators/userPreferencesValidator");
const ValidateRequest = require("../middleware/validateRequest");

/**
 * @api {get} /api/user/preferences/extended Get Extended User Preferences
 * @apiName GetExtendedUserPreferences
 * @apiGroup User Preferences
 * @apiDescription Get user preferences including notification preferences, language, theme, and font size
 * 
 * @apiHeader {String} Authorization Bearer token for authentication
 * 
 * @apiSuccess {Object} response API response
 * @apiSuccess {Boolean} response.success Success status
 * @apiSuccess {Object} response.data User preferences data
 * @apiSuccess {Object} response.data.notification_preferences User's notification preferences
 * @apiSuccess {String} response.data.language User's preferred language
 * @apiSuccess {String} response.data.theme User's theme preference
 * @apiSuccess {String} response.data.font_size User's font size preference
 */
router.get("/", authenticateToken, controller.getUserPreferences);

/**
 * @api {post} /api/user/preferences/extended Update Extended User Preferences
 * @apiName UpdateExtendedUserPreferences
 * @apiGroup User Preferences
 * @apiDescription Update user preferences including notification preferences, language, theme, and font size
 * 
 * @apiHeader {String} Authorization Bearer token for authentication
 * 
 * @apiParam {Object} user User object containing userId
 * @apiParam {Object} [notification_preferences] User's notification preferences
 * @apiParam {String} [language] User's preferred language code
 * @apiParam {String} [theme] User's theme preference (light/dark)
 * @apiParam {String} [font_size] User's font size preference
 * 
 * @apiSuccess {Object} response API response
 * @apiSuccess {Boolean} response.success Success status
 * @apiSuccess {String} response.message Success message
 */
router.post("/", authenticateToken, validateUserPreferences, ValidateRequest, controller.postUserPreferences);

/**
 * @api {get} /api/user/preferences/notifications Get Notification Preferences
 * @apiName GetNotificationPreferences
 * @apiGroup User Preferences
 * @apiDescription Get user's notification preferences only
 * 
 * @apiHeader {String} Authorization Bearer token for authentication
 * 
 * @apiSuccess {Object} response API response
 * @apiSuccess {Boolean} response.success Success status
 * @apiSuccess {Object} response.data Notification preferences object
 */
router.get("/notifications", authenticateToken, controller.getNotificationPreferences);

/**
 * @api {put} /api/user/preferences/notifications Update Notification Preferences
 * @apiName UpdateNotificationPreferences
 * @apiGroup User Preferences
 * @apiDescription Update user's notification preferences only
 * 
 * @apiHeader {String} Authorization Bearer token for authentication
 * 
 * @apiParam {Object} notification_preferences User's notification preferences object
 * 
 * @apiSuccess {Object} response API response
 * @apiSuccess {Boolean} response.success Success status
 * @apiSuccess {String} response.message Success message
 */
router.put("/notifications", authenticateToken, controller.updateNotificationPreferences);

module.exports = router;
