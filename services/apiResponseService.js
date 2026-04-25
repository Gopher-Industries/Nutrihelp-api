function createSuccessResponse(data, meta) {
  const response = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
}

function createErrorResponse(message, code, details) {
  const response = {
    success: false,
    error: {
      message,
    },
  };

  if (code) {
    response.error.code = code;
  }

  if (details) {
    response.error.details = details;
  }

  return response;
}

function formatProfile(profile) {
  if (!profile) return null;

  return {
    id: profile.user_id,
    email: profile.email,
    name: profile.name || null,
    firstName: profile.first_name || null,
    lastName: profile.last_name || null,
    contactNumber: profile.contact_number || null,
    address: profile.address || null,
    imageUrl: profile.image_url || null,
    mfaEnabled: Boolean(profile.mfa_enabled),
    role: profile.user_roles?.role_name || profile.role || null,
    registrationDate: profile.registration_date || null,
    lastLogin: profile.last_login || null,
    accountStatus: profile.account_status || null,
  };
}

function formatSession(payload) {
  if (!payload) return null;

  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    tokenType: payload.tokenType || "Bearer",
    expiresIn: payload.expiresIn,
  };
}

function formatNotification(notification) {
  return {
    id: notification.simple_id,
    type: notification.type || "general",
    content: notification.content || "",
    status: notification.status || "unread",
    createdAt: notification.created_at || null,
  };
}

function formatNotifications(notifications) {
  return (notifications || []).map(formatNotification);
}

function formatRecipe(recipeWrapper) {
  const recipe = recipeWrapper?.recipe_id || {};

  return {
    recipeId: recipeWrapper?.recipe_id ?? recipe.id ?? null,
    title: recipe.recipe_name || null,
    cuisine: recipe.cuisine?.name || null,
    cookingMethod: recipe.cooking_method?.name || null,
    preparationTime: recipe.preparation_time ?? null,
    totalServings: recipe.total_servings ?? null,
    nutrition: {
      calories: recipe.calories ?? null,
      protein: recipe.protein ?? null,
      fiber: recipe.fiber ?? null,
      carbohydrates: recipe.carbohydrates ?? null,
      fat: recipe.fat ?? null,
      sodium: recipe.sodium ?? null,
      sugar: recipe.sugar ?? null,
    },
  };
}

function formatMealPlans(mealPlans) {
  return (mealPlans || []).map((mealPlan) => ({
    id: mealPlan.id,
    mealType: mealPlan.meal_type || null,
    recipeCount: Array.isArray(mealPlan.recipes) ? mealPlan.recipes.length : 0,
    recipes: (mealPlan.recipes || []).map(formatRecipe),
  }));
}

function formatRecommendation(item) {
  return {
    rank: item.rank,
    recipeId: item.recipeId,
    title: item.title,
    explanation: item.explanation,
    nutrition: item.metadata?.nutrition || {},
    preparationTime: item.metadata?.preparationTime ?? null,
    totalServings: item.metadata?.totalServings ?? null,
  };
}

function formatRecommendations(items) {
  return (items || []).map(formatRecommendation);
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  formatMealPlans,
  formatNotifications,
  formatProfile,
  formatRecommendations,
  formatSession,
};
