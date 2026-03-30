const authService = require("../services/authService");
const supabase = require("../dbConnection");
const getUserProfile = require("../model/getUserProfile");
const mealPlanModel = require("../model/mealPlan");
const { generateRecommendations } = require("../services/recommendationService");
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

    const result = await authService.register({
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

    const result = await authService.login({ email, password }, getDeviceInfo(req));

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

    const result = await authService.refreshAccessToken(refreshToken, getDeviceInfo(req));

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

    const result = await authService.logout(refreshToken);
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
    const profiles = await getUserProfile(req.user.email);
    const profile = Array.isArray(profiles) ? profiles[0] || null : profiles || null;

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

    let listQuery = supabase
      .from("notifications")
      .select("simple_id, type, content, status, created_at")
      .eq("user_id", req.user.userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      listQuery = listQuery.eq("status", status);
    }

    const unreadQuery = supabase
      .from("notifications")
      .select("simple_id", { count: "exact", head: true })
      .eq("user_id", req.user.userId)
      .eq("status", "unread");

    const [{ data, error }, { count, error: unreadError }] = await Promise.all([
      listQuery,
      unreadQuery,
    ]);

    if (error) throw error;
    if (unreadError) throw unreadError;

    return res.status(200).json(
      createEnvelope(
        {
          items: formatNotifications(data || []),
        },
        {
          count: (data || []).length,
          unreadCount: count || 0,
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
    const mealPlans = await mealPlanModel.get(req.user.userId);

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
    const payload = await generateRecommendations({
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
    const [profiles, latestNotifications, unreadSummary, mealPlans, recommendations] =
      await Promise.all([
        getUserProfile(req.user.email),
        supabase
          .from("notifications")
          .select("simple_id, type, content, status, created_at")
          .eq("user_id", req.user.userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("notifications")
          .select("simple_id", { count: "exact", head: true })
          .eq("user_id", req.user.userId)
          .eq("status", "unread"),
        mealPlanModel.get(req.user.userId),
        generateRecommendations({
          userId: req.user.userId,
          email: req.user.email,
          healthGoals: body.healthGoals || {},
          dietaryConstraints: body.dietaryConstraints || {},
          maxResults: parsePositiveInteger(body.maxResults, 3, 10),
        }),
      ]);

    if (latestNotifications.error) throw latestNotifications.error;
    if (unreadSummary.error) throw unreadSummary.error;

    const profile = Array.isArray(profiles) ? profiles[0] || null : profiles || null;
    const formattedMealPlans = formatMealPlans(mealPlans || []);
    const activeMealPlan = formattedMealPlans[0] || null;

    return res.status(200).json(
      createEnvelope({
        user: formatProfile(profile),
        notifications: {
          unreadCount: unreadSummary.count || 0,
          items: formatNotifications(latestNotifications.data || []),
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
