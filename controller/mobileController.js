const mobileAuthService = require("../services/mobile/mobileAuthService");
const mobileProfileService = require("../services/mobile/mobileProfileService");
const mobileNotificationService = require("../services/mobile/mobileNotificationService");
const mobileMealPlanService = require("../services/mobile/mobileMealPlanService");
const mobileRecommendationService = require("../services/mobile/mobileRecommendationService");
const mobileHomeService = require("../services/mobile/mobileHomeService");
const {
  createEnvelope,
  createErrorEnvelope,
  formatMealPlans,
  formatNotifications,
  formatProfile,
  formatRecommendations,
  formatSession,
} = require("../services/mobilePayloadService");

function getDeviceInfo(req) {
  return {
    ip: req.ip,
    userAgent: req.get("User-Agent") || "Unknown",
    deviceId: req.get("X-Device-Id") || null,
    clientType: req.get("X-Client-Type") || "mobile",
  };
}

function parsePositiveInteger(value, fallback, max = 50) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function sendMobileError(res, status, message, code, details) {
  return res.status(status).json(createErrorEnvelope(message, code, details));
}

exports.register = async (req, res) => {
  try {
    const body = req.body || {};
    const { name, email, password, first_name, last_name } = body;

    if (!name || !email || !password) {
      return sendMobileError(
        res,
        400,
        "Name, email, and password are required",
        "VALIDATION_ERROR",
      );
    }

    const result = await mobileAuthService.registerMobileUser({
      name,
      email,
      password,
      first_name,
      last_name,
    });

    return res.status(201).json(
      createEnvelope(
        {
          user: {
            id: result.user?.user_id || null,
            email: result.user?.email || email,
            name: result.user?.name || name,
          },
        },
        { message: result.message || "User registered successfully" },
      ),
    );
  } catch (error) {
    return sendMobileError(
      res,
      400,
      error.message || "Registration failed",
      "REGISTER_FAILED",
    );
  }
};

exports.login = async (req, res) => {
  try {
    const body = req.body || {};
    const { email, password } = body;
    if (!email || !password) {
      return sendMobileError(
        res,
        400,
        "Email and password are required",
        "VALIDATION_ERROR",
      );
    }

    const result = await mobileAuthService.loginMobileUser({ email, password }, getDeviceInfo(req));

    return res.status(200).json(
      createEnvelope({
        user: result.user,
        session: formatSession(result),
      }),
    );
  } catch (error) {
    return sendMobileError(
      res,
      401,
      error.message || "Login failed",
      "AUTHENTICATION_FAILED",
    );
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const body = req.body || {};
    const { refreshToken } = body;

    if (!refreshToken) {
      return sendMobileError(
        res,
        400,
        "Refresh token is required",
        "VALIDATION_ERROR",
      );
    }

    const result = await mobileAuthService.refreshMobileSession(refreshToken, getDeviceInfo(req));

    return res.status(200).json(
      createEnvelope({
        session: formatSession(result),
      }),
    );
  } catch (error) {
    return sendMobileError(
      res,
      401,
      error.message || "Token refresh failed",
      "REFRESH_FAILED",
    );
  }
};

exports.logout = async (req, res) => {
  try {
    const body = req.body || {};
    const { refreshToken } = body;

    if (!refreshToken) {
      return sendMobileError(
        res,
        400,
        "Refresh token is required",
        "VALIDATION_ERROR",
      );
    }

    const result = await mobileAuthService.logoutMobileSession(refreshToken);
    return res.status(200).json(createEnvelope(null, { message: result.message }));
  } catch (error) {
    return sendMobileError(
      res,
      500,
      error.message || "Logout failed",
      "LOGOUT_FAILED",
    );
  }
};

exports.getMe = async (req, res) => {
  try {
    const profile = await mobileProfileService.getProfileByEmail(req.user.email);

    if (!profile) {
      return sendMobileError(res, 404, "User not found", "USER_NOT_FOUND");
    }

    return res.status(200).json(
      createEnvelope({
        user: formatProfile(profile),
      }),
    );
  } catch (error) {
    return sendMobileError(
      res,
      500,
      "Failed to load profile",
      "PROFILE_LOAD_FAILED",
    );
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const limit = parsePositiveInteger(req.query.limit, 20);
    const status = req.query.status;

    const { notifications, unreadCount } = await mobileNotificationService.getNotificationSummary(
      req.user.userId,
      { limit, status },
    );

    return res.status(200).json(
      createEnvelope(
        {
          items: formatNotifications(notifications),
        },
        {
          count: notifications.length,
          unreadCount,
        },
      ),
    );
  } catch (error) {
    return sendMobileError(
      res,
      500,
      "Failed to load notifications",
      "NOTIFICATIONS_LOAD_FAILED",
    );
  }
};

exports.getMyMealPlans = async (req, res) => {
  try {
    const mealPlans = await mobileMealPlanService.getMealPlansByUserId(req.user.userId);

    return res.status(200).json(
      createEnvelope(
        {
          items: formatMealPlans(mealPlans || []),
        },
        {
          count: Array.isArray(mealPlans) ? mealPlans.length : 0,
        },
      ),
    );
  } catch (error) {
    return sendMobileError(
      res,
      500,
      "Failed to load meal plans",
      "MEALPLANS_LOAD_FAILED",
    );
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const body = req.body || {};
    const maxResults = parsePositiveInteger(body.maxResults, 5, 20);
    const payload = await mobileRecommendationService.generateMobileRecommendations({
      userId: req.user.userId,
      email: req.user.email,
      healthGoals: body.healthGoals || {},
      dietaryConstraints: body.dietaryConstraints || {},
      aiInsights: body.aiInsights || null,
      medicalReport: body.medicalReport || null,
      aiAdapterInput: body.aiAdapterInput || null,
      maxResults,
      refreshCache: body.refreshCache === true,
    });

    return res.status(200).json(
      createEnvelope(
        {
          items: formatRecommendations(payload.recommendations || []),
        },
        {
          count: (payload.recommendations || []).length,
          generatedAt: payload.generatedAt,
          contractVersion: payload.contractVersion,
          source: payload.source,
        },
      ),
    );
  } catch (error) {
    const status = error.statusCode || 500;
    const message =
      status >= 500
        ? "Failed to generate recommendations"
        : error.message || "Invalid recommendation request";

    return sendMobileError(
      res,
      status,
      message,
      status >= 500 ? "RECOMMENDATION_FAILED" : "VALIDATION_ERROR",
    );
  }
};

exports.getHomeSummary = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      profile,
      notifications,
      unreadCount,
      mealPlans,
      recommendations,
    } = await mobileHomeService.getHomeSummary({
      userId: req.user.userId,
      email: req.user.email,
      healthGoals: body.healthGoals || {},
      dietaryConstraints: body.dietaryConstraints || {},
      maxResults: parsePositiveInteger(body.maxResults, 3, 10),
    });
    const formattedMealPlans = formatMealPlans(mealPlans || []);
    const activeMealPlan = formattedMealPlans[0] || null;

    return res.status(200).json(
      createEnvelope({
        user: formatProfile(profile),
        notifications: {
          unreadCount,
          items: formatNotifications(notifications),
        },
        recommendations: formatRecommendations(recommendations.recommendations || []),
        mealPlan: activeMealPlan,
        mealPlanCount: formattedMealPlans.length,
      }),
    );
  } catch (error) {
    return sendMobileError(
      res,
      500,
      "Failed to load home summary",
      "HOME_SUMMARY_FAILED",
    );
  }
};
