const supabase = require("../dbConnection.js");
const { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState } = require("./userPreferenceState");
const { ServiceError } = require("../services/serviceError");
const fetchUserPreferences = require("./fetchUserPreferences");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hasOwnProperty(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function hasAnyOwnProperty(object, keys = []) {
  return keys.some((key) => hasOwnProperty(object, key));
}

function extractPreferenceId(value) {
  if (Number.isInteger(value) && value > 0) return value;
  if (value && typeof value === "object") {
    for (const candidate of [value.referenceId, value.id]) {
      const parsed = Number(candidate);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
}

function normalizePreferenceIds(values = []) {
  if (!Array.isArray(values)) return [];
  return [...new Set(
    values.map(extractPreferenceId).filter((v) => Number.isInteger(v) && v > 0)
  )];
}

function getFoodPreferenceSource(body = {}) {
  return body.food_preferences && typeof body.food_preferences === "object"
    ? body.food_preferences
    : body;
}

function normalizeHealthContext(healthContext = {}) {
  return {
    allergies: Array.isArray(healthContext.allergies) ? healthContext.allergies : [],
    chronic_conditions: Array.isArray(healthContext.chronic_conditions) ? healthContext.chronic_conditions : [],
    medications: Array.isArray(healthContext.medications) ? healthContext.medications : []
  };
}

function normalizeUiSettings(settings = {}) {
  return {
    language: settings.language || "en",
    theme: settings.theme || "light",
    font_size: settings.font_size || "16px"
  };
}

function normalizeNotificationPreferences(preferences = {}) {
  return {
    mealReminders: preferences.mealReminders !== false,
    waterReminders: preferences.waterReminders !== false,
    healthTips: preferences.healthTips !== false,
    weeklyReports: Boolean(preferences.weeklyReports),
    systemUpdates: preferences.systemUpdates !== false
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Join table helpers
// ─────────────────────────────────────────────────────────────────────────────

const PREFERENCE_TABLES = [
  { table: "user_dietary_requirements", foreignKey: "dietary_requirement_id", key: "dietary_requirements" },
  { table: "user_allergies", foreignKey: "allergy_id", key: "allergies" },
  { table: "user_cuisines", foreignKey: "cuisine_id", key: "cuisines" },
  { table: "user_dislikes", foreignKey: "dislike_id", key: "dislikes" },
  { table: "user_health_conditions", foreignKey: "health_condition_id", key: "health_conditions" },
  { table: "user_spice_levels", foreignKey: "spice_level_id", key: "spice_levels" },
  { table: "user_cooking_methods", foreignKey: "cooking_method_id", key: "cooking_methods" }
];

async function replaceJoinTable(table, userId, foreignKey, values = []) {
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  if (!values.length) return;

  const records = values.map((value) => ({
    user_id: userId,
    [foreignKey]: value
  }));

  const { error: insertError } = await supabase.from(table).insert(records);
  if (insertError) throw insertError;
}

async function replaceUserPreferencesFallback(userId, preferenceGroups) {
  for (const { table, foreignKey, key } of PREFERENCE_TABLES) {
    await replaceJoinTable(table, userId, foreignKey, preferenceGroups[key] || []);
  }
}

async function replaceUserPreferencesTransaction(userId, preferenceGroups) {
  const { error } = await supabase.rpc("replace_user_preferences", {
    p_user_id: userId,
    p_dietary_requirements: preferenceGroups.dietary_requirements,
    p_allergies: preferenceGroups.allergies,
    p_cuisines: preferenceGroups.cuisines,
    p_dislikes: preferenceGroups.dislikes,
    p_health_conditions: preferenceGroups.health_conditions,
    p_spice_levels: preferenceGroups.spice_levels,
    p_cooking_methods: preferenceGroups.cooking_methods
  });

  if (!error) return;

  const rpcMissing =
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /replace_user_preferences/i.test(error.message || "");

  if (rpcMissing) {
    await replaceUserPreferencesFallback(userId, preferenceGroups);
    return;
  }

  throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

async function updateUserPreferences(userId, body = {}) {
  const normalizedUserId = Number(userId);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new ServiceError(400, "User ID must be a positive integer");
  }

  // Support both canonical nested payload { food_preferences: { ... } }
  // and legacy flat payload { dietary_requirements: [], cuisines: [], ... }
  const foodSource = getFoodPreferenceSource(body);
  const incomingHealthContext =
    body.health_context && typeof body.health_context === "object"
      ? body.health_context
      : undefined;

  // Detect which sections were explicitly provided
  const hasDietaryRequirementsUpdate = hasOwnProperty(foodSource, "dietary_requirements");
  const hasCuisinesUpdate           = hasOwnProperty(foodSource, "cuisines");
  const hasDislikesUpdate           = hasOwnProperty(foodSource, "dislikes");
  const hasSpiceLevelsUpdate        = hasOwnProperty(foodSource, "spice_levels");
  const hasCookingMethodsUpdate     = hasOwnProperty(foodSource, "cooking_methods");

  const hasAllergiesUpdate =
    hasOwnProperty(body, "allergies") ||
    (incomingHealthContext && hasOwnProperty(incomingHealthContext, "allergies"));

  const hasHealthConditionsUpdate =
    hasOwnProperty(body, "health_conditions") ||
    (incomingHealthContext && hasOwnProperty(incomingHealthContext, "chronic_conditions"));

  const hasHealthContextUpdate      = hasOwnProperty(body, "health_context");
  const hasNotificationUpdate       = hasOwnProperty(body, "notification_preferences");
  const hasUiSettingsUpdate         = hasOwnProperty(body, "ui_settings");

  const hasAnySupportedUpdate =
    hasDietaryRequirementsUpdate ||
    hasAllergiesUpdate ||
    hasCuisinesUpdate ||
    hasDislikesUpdate ||
    hasHealthConditionsUpdate ||
    hasSpiceLevelsUpdate ||
    hasCookingMethodsUpdate ||
    hasHealthContextUpdate ||
    hasNotificationUpdate ||
    hasUiSettingsUpdate;

  if (!hasAnySupportedUpdate) {
    throw new ServiceError(400, "No supported preference fields were provided");
  }

  // Fetch current preferences so we can preserve unmodified groups
  const current = await fetchUserPreferences(normalizedUserId);

  // ── Join tables ────────────────────────────────────────────────────────────
  const shouldUpdateJoinTables =
    hasDietaryRequirementsUpdate ||
    hasAllergiesUpdate ||
    hasCuisinesUpdate ||
    hasDislikesUpdate ||
    hasHealthConditionsUpdate ||
    hasSpiceLevelsUpdate ||
    hasCookingMethodsUpdate;

  if (shouldUpdateJoinTables) {
    const nextGroups = {
      dietary_requirements: hasDietaryRequirementsUpdate
        ? normalizePreferenceIds(foodSource.dietary_requirements)
        : normalizePreferenceIds(current.dietary_requirements),

      allergies: hasAllergiesUpdate
        ? normalizePreferenceIds(
            incomingHealthContext && hasOwnProperty(incomingHealthContext, "allergies")
              ? incomingHealthContext.allergies
              : body.allergies
          )
        : normalizePreferenceIds(current.allergies),

      cuisines: hasCuisinesUpdate
        ? normalizePreferenceIds(foodSource.cuisines)
        : normalizePreferenceIds(current.cuisines),

      dislikes: hasDislikesUpdate
        ? normalizePreferenceIds(foodSource.dislikes)
        : normalizePreferenceIds(current.dislikes),

      health_conditions: hasHealthConditionsUpdate
        ? normalizePreferenceIds(
            incomingHealthContext && hasOwnProperty(incomingHealthContext, "chronic_conditions")
              ? incomingHealthContext.chronic_conditions
              : body.health_conditions
          )
        : normalizePreferenceIds(current.health_conditions),

      spice_levels: hasSpiceLevelsUpdate
        ? normalizePreferenceIds(foodSource.spice_levels)
        : normalizePreferenceIds(current.spice_levels),

      cooking_methods: hasCookingMethodsUpdate
        ? normalizePreferenceIds(foodSource.cooking_methods)
        : normalizePreferenceIds(current.cooking_methods),
    };

    await replaceUserPreferencesTransaction(normalizedUserId, nextGroups);
  }

  // ── Preference state (health_context, notifications, ui_settings) ──────────
  if (hasHealthContextUpdate || hasNotificationUpdate || hasUiSettingsUpdate) {
    const currentState = current;

    await saveUserPreferenceState(normalizedUserId, (stored) => {
      const currentHealthContext = stored.health_context || EMPTY_HEALTH_CONTEXT;

      const nextHealthContext = hasHealthContextUpdate
        ? {
            allergies: incomingHealthContext && hasOwnProperty(incomingHealthContext, "allergies")
              ? normalizeHealthContext(incomingHealthContext).allergies
              : currentHealthContext.allergies || [],
            chronic_conditions: incomingHealthContext && hasOwnProperty(incomingHealthContext, "chronic_conditions")
              ? normalizeHealthContext(incomingHealthContext).chronic_conditions
              : currentHealthContext.chronic_conditions || [],
            medications: incomingHealthContext && hasOwnProperty(incomingHealthContext, "medications")
              ? normalizeHealthContext(incomingHealthContext).medications
              : currentHealthContext.medications || [],
          }
        : currentHealthContext;

      const nextNotificationPreferences = hasNotificationUpdate
        ? normalizeNotificationPreferences({
            ...(stored.notification_preferences || {}),
            ...body.notification_preferences,
          })
        : stored.notification_preferences || {};

      const nextUiSettings = hasUiSettingsUpdate
        ? normalizeUiSettings({
            ...(stored.ui_settings || {}),
            ...body.ui_settings,
          })
        : stored.ui_settings || {};

      return {
        ...stored,
        health_context: nextHealthContext,
        notification_preferences: nextNotificationPreferences,
        ui_settings: nextUiSettings,
      };
    });
  }
}

module.exports = updateUserPreferences;
