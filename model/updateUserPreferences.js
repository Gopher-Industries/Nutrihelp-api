const supabase = require("../dbConnection.js");
const { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState } = require("./userPreferenceState");
const { ServiceError } = require("../services/serviceError");

function listFromHealthContext(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (Number.isInteger(item)) return item;
      if (item && Number.isInteger(item.referenceId)) return item.referenceId;
      if (item && Number.isInteger(item.id)) return item.id;
      return null;
    })
    .filter(Number.isInteger);
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
    language: settings.language || 'en',
    theme: settings.theme || 'light',
    font_size: settings.font_size || '16px'
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

function normalizePreferenceIds(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0))];
}

function hasOwnProperty(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
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

  if (!error) {
    return;
  }

  const rpcMissing = error.code === "PGRST202"
    || error.code === "42883"
    || /replace_user_preferences/i.test(error.message || "");

  if (rpcMissing) {
    throw new ServiceError(
      500,
      "Database function replace_user_preferences is missing. Apply database/user-preferences-transaction.sql in Supabase before deploying this API."
    );
  }

  throw error;
}

async function updateUserPreferences(userId, body = {}) {
  try {
    const normalizedUserId = Number(userId);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new ServiceError(400, 'User ID must be a positive integer');
    }

    const healthContext = normalizeHealthContext(body.health_context);

    const dietaryRequirements = Array.isArray(body.dietary_requirements) ? body.dietary_requirements : [];
    const allergies = Array.isArray(body.allergies) ? body.allergies : listFromHealthContext(healthContext.allergies);
    const cuisines = Array.isArray(body.cuisines) ? body.cuisines : [];
    const dislikes = Array.isArray(body.dislikes) ? body.dislikes : [];
    const healthConditions = Array.isArray(body.health_conditions) ? body.health_conditions : listFromHealthContext(healthContext.chronic_conditions);
    const spiceLevels = Array.isArray(body.spice_levels) ? body.spice_levels : [];
    const cookingMethods = Array.isArray(body.cooking_methods) ? body.cooking_methods : [];

    const shouldUpdateJoinTables = [
      'dietary_requirements',
      'allergies',
      'cuisines',
      'dislikes',
      'health_conditions',
      'spice_levels',
      'cooking_methods'
    ].some((key) => body[key] !== undefined) || body.health_context !== undefined;

    if (
      !body.health_context
      && !body.notification_preferences
      && !body.ui_settings
      && ![
        'dietary_requirements',
        'allergies',
        'cuisines',
        'dislikes',
        'health_conditions',
        'spice_levels',
        'cooking_methods'
      ].every((key) => hasOwnProperty(body, key))
    ) {
      throw new ServiceError(
        400,
        'All preference groups are required: dietary_requirements, allergies, cuisines, dislikes, health_conditions, spice_levels, cooking_methods'
      );
    }

    if (shouldUpdateJoinTables) {
      await replaceUserPreferencesTransaction(normalizedUserId, {
        dietary_requirements: normalizePreferenceIds(dietaryRequirements),
        allergies: normalizePreferenceIds(allergies),
        cuisines: normalizePreferenceIds(cuisines),
        dislikes: normalizePreferenceIds(dislikes),
        health_conditions: normalizePreferenceIds(healthConditions),
        spice_levels: normalizePreferenceIds(spiceLevels),
        cooking_methods: normalizePreferenceIds(cookingMethods)
      });
    }

    if (
      body.health_context !== undefined ||
      body.notification_preferences !== undefined ||
      body.ui_settings !== undefined
    ) {
      await saveUserPreferenceState(normalizedUserId, (current) => ({
        ...current,
        health_context: body.health_context !== undefined
          ? normalizeHealthContext(body.health_context)
          : current.health_context || EMPTY_HEALTH_CONTEXT,
        notification_preferences: body.notification_preferences !== undefined
          ? normalizeNotificationPreferences(body.notification_preferences)
          : current.notification_preferences || {},
        ui_settings: body.ui_settings !== undefined
          ? normalizeUiSettings(body.ui_settings)
          : current.ui_settings || {}
      }));
    }
  } catch (error) {
    throw error;
  }
}

module.exports = updateUserPreferences;
