const mobileProfileService = require("./mobileProfileService");
const mobileNotificationService = require("./mobileNotificationService");
const mobileMealPlanService = require("./mobileMealPlanService");
const mobileRecommendationService = require("./mobileRecommendationService");

async function getHomeSummary({
  userId,
  email,
  healthGoals = {},
  dietaryConstraints = {},
  maxResults,
}) {
  const [profile, notificationSummary, mealPlans, recommendations] =
    await Promise.all([
      mobileProfileService.getProfileByEmail(email),
      mobileNotificationService.getNotificationSummary(userId, { limit: 5 }),
      mobileMealPlanService.getMealPlansByUserId(userId),
      mobileRecommendationService.generateMobileRecommendations({
        userId,
        email,
        healthGoals,
        dietaryConstraints,
        maxResults,
      }),
    ]);

  return {
    profile,
    mealPlans,
    notifications: notificationSummary.notifications,
    unreadCount: notificationSummary.unreadCount,
    recommendations,
  };
}

module.exports = {
  getHomeSummary,
};
