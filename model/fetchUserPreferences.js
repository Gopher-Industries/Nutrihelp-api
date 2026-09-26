const supabase = require("../dbConnection.js");
const {
  getUserPreferenceState,
  EMPTY_HEALTH_CONTEXT,
} = require("./userPreferenceState");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryablePreferenceError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("socket") ||
    message.includes("econn") ||
    message.includes("etimedout")
  );
}

async function fetchPreferenceRows(table, selectClause, userId) {
  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .select(selectClause)
      .eq("user_id", userId);

    if (!error) {
      return Array.isArray(data) ? data : [];
    }

    lastError = error;
    if (attempt === maxAttempts || !isRetryablePreferenceError(error)) {
      break;
    }

    await sleep(120 * attempt);
  }

  throw lastError;
}

async function fetchUserPreferences(userId) {
  try {
    const [
      dietaryRequirements,
      allergies,
      cuisines,
      dislikes,
      healthConditions,
      spiceLevels,
      cookingMethods,
      storedState,
    ] = await Promise.all([
      fetchPreferenceRows(
        "user_dietary_requirements",
        "...dietary_requirement_id(id, name)",
        userId
      ),
      fetchPreferenceRows("user_allergies", "...allergy_id(id, name)", userId),
      fetchPreferenceRows("user_cuisines", "...cuisine_id(id, name)", userId),
      fetchPreferenceRows("user_dislikes", "...dislike_id(id, name)", userId),
      fetchPreferenceRows(
        "user_health_conditions",
        "...health_condition_id(id, name)",
        userId
      ),
      fetchPreferenceRows(
        "user_spice_levels",
        "...spice_level_id(id, name)",
        userId
      ),
      fetchPreferenceRows(
        "user_cooking_methods",
        "...cooking_method_id(id, name)",
        userId
      ),
      getUserPreferenceState(userId),
    ]);

    return {
      dietary_requirements: dietaryRequirements,
      allergies,
      cuisines,
      dislikes,
      health_conditions: healthConditions,
      spice_levels: spiceLevels,
      cooking_methods: cookingMethods,
      health_context: storedState.health_context || EMPTY_HEALTH_CONTEXT,
      notification_preferences: storedState.notification_preferences || {},
      ui_settings: storedState.ui_settings || {},
    };
  } catch (error) {
    throw error;
  }
}

module.exports = fetchUserPreferences;
