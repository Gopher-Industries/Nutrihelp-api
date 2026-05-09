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

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeInstructions(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n|(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRecipeIngredients(sourceIngredients, ingredientNames = [], ingredientCategories = []) {
  const ingredientIds = Array.isArray(sourceIngredients?.id) ? sourceIngredients.id : [];
  const ingredientQuantities = Array.isArray(sourceIngredients?.quantity) ? sourceIngredients.quantity : [];

  if (!ingredientIds.length && !ingredientNames.length) {
    return [];
  }

  const total = Math.max(ingredientIds.length, ingredientNames.length, ingredientQuantities.length);

  return Array.from({ length: total }, (_, index) => ({
    ingredientId: ingredientIds[index] ?? null,
    name: ingredientNames[index] || null,
    category: ingredientCategories[index] || null,
    quantity: ingredientQuantities[index] ?? null,
  })).filter((item) => item.ingredientId || item.name);
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
  const nestedRecipe = recipeWrapper?.recipe_id;
  const recipe = nestedRecipe && typeof nestedRecipe === "object"
    ? nestedRecipe
    : (recipeWrapper || {});
  const recipeId = typeof nestedRecipe === "number"
    ? nestedRecipe
    : (recipeWrapper?.recipeId ?? recipe?.id ?? null);
  const title = recipe.recipe_name || recipe.title || recipeWrapper?.title || null;
  const cuisine = recipe.cuisine?.name || recipe.cuisine_name || recipe.cuisine || recipeWrapper?.cuisine || null;
  const cookingMethod = recipe.cooking_method?.name || recipe.cooking_method_name || recipe.cookingMethod || recipeWrapper?.cookingMethod || null;
  const imageUrl = recipe.image_url || recipe.imageUrl || recipeWrapper?.image_url || recipeWrapper?.imageUrl || null;
  const instructions = normalizeInstructions(recipe.instructions || recipeWrapper?.instructions);
  const ingredients = formatRecipeIngredients(
    recipe.ingredients,
    recipe.ingredients?.name || recipe.ingredient_names || [],
    recipe.ingredients?.category || recipe.ingredient_categories || []
  );
  const nutrition = {
    calories: toNumberOrNull(recipe.calories),
    protein: toNumberOrNull(recipe.protein),
    fiber: toNumberOrNull(recipe.fiber),
    carbohydrates: toNumberOrNull(recipe.carbohydrates),
    fat: toNumberOrNull(recipe.fat),
    sodium: toNumberOrNull(recipe.sodium),
    sugar: toNumberOrNull(recipe.sugar),
  };

  return {
    id: recipeId,
    recipeId,
    recipe_id: recipeId,
    title,
    recipe_name: title,
    description: recipe.description || null,
    cuisine,
    cuisineName: cuisine,
    cookingMethod,
    cooking_method: cookingMethod,
    preparationTime: recipe.preparation_time ?? recipe.preparationTime ?? null,
    preparation_time: recipe.preparation_time ?? recipe.preparationTime ?? null,
    totalServings: recipe.total_servings ?? recipe.totalServings ?? null,
    total_servings: recipe.total_servings ?? recipe.totalServings ?? null,
    imageUrl,
    image_url: imageUrl,
    instructions,
    ingredients,
    nutrition,
    allergy: Boolean(recipe.allergy),
    dislike: Boolean(recipe.dislike),
  };
}

function formatMealPlans(mealPlans) {
  return (mealPlans || []).map((mealPlan) => {
    const createdAt = mealPlan.created_at || mealPlan.createdAt || null;
    const mealType = mealPlan.meal_type || mealPlan.mealType || null;
    const recipes = (mealPlan.recipes || []).map(formatRecipe);

    return {
      id: mealPlan.id,
      createdAt,
      created_at: createdAt,
      date: createdAt ? String(createdAt).slice(0, 10) : null,
      mealType,
      meal_type: mealType,
      recipeCount: recipes.length,
      recipe_count: recipes.length,
      recipes,
    };
  });
}

function formatRecommendation(item) {
  return {
    id: item.recipeId,
    rank: item.rank,
    recipeId: item.recipeId,
    recipe_id: item.recipeId,
    title: item.title,
    explanation: item.explanation,
    nutrition: item.metadata?.nutrition || {},
    preparationTime: item.metadata?.preparationTime ?? null,
    preparation_time: item.metadata?.preparationTime ?? null,
    totalServings: item.metadata?.totalServings ?? null,
    total_servings: item.metadata?.totalServings ?? null,
    safetyLevel: item.safetyLevel || null,
    safety_level: item.safetyLevel || null,
    imageUrl: item.metadata?.imageUrl || null,
    image_url: item.metadata?.imageUrl || null,
  };
}

function formatRecommendations(items) {
  return (items || []).map(formatRecommendation);
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  formatMealPlans,
  formatNotification,
  formatNotifications,
  formatProfile,
  formatRecipe,
  formatRecommendations,
  formatSession,
};
