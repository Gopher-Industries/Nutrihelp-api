const express = require("express");
const router = express.Router();

const mobileController = require("../controller/mobileController");
const { authenticateToken } = require("../middleware/authenticateToken");

router.post("/auth/register", mobileController.register);
router.post("/auth/login", mobileController.login);
router.post("/auth/refresh", mobileController.refreshToken);
router.post("/auth/logout", mobileController.logout);

router.get("/me", authenticateToken, mobileController.getMe);
router.get("/notifications", authenticateToken, mobileController.getMyNotifications);
router.get("/meal-plans", authenticateToken, mobileController.getMyMealPlans);
router.post("/recommendations", authenticateToken, mobileController.getRecommendations);
router.post("/home-summary", authenticateToken, mobileController.getHomeSummary);

module.exports = router;
