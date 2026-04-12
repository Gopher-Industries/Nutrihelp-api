const supabase = require("../dbConnection.js");
const { saveUserPreferenceState } = require('../services/userPreferenceStore');

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

async function replaceJoinTable(table, userId, foreignKey, values) {
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  if (!values.length) {
    return;
  }

  const { error: insertError } = await supabase
    .from(table)
    .insert(values.map((id) => ({ user_id: userId, [foreignKey]: id })));

  if (insertError) throw insertError;
}

async function updateUserPreferences(userId, body = {}) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
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

    if (shouldUpdateJoinTables) {
      await replaceJoinTable("user_dietary_requirements", userId, "dietary_requirement_id", dietaryRequirements);
      await replaceJoinTable("user_allergies", userId, "allergy_id", allergies);
      await replaceJoinTable("user_cuisines", userId, "cuisine_id", cuisines);
      await replaceJoinTable("user_dislikes", userId, "dislike_id", dislikes);
      await replaceJoinTable("user_health_conditions", userId, "health_condition_id", healthConditions);
      await replaceJoinTable("user_spice_levels", userId, "spice_level_id", spiceLevels);
      await replaceJoinTable("user_cooking_methods", userId, "cooking_method_id", cookingMethods);
    }

    if (
      body.health_context !== undefined ||
      body.notification_preferences !== undefined ||
      body.ui_settings !== undefined
    ) {
      saveUserPreferenceState(userId, (current) => ({
        ...current,
        health_context: body.health_context !== undefined
          ? normalizeHealthContext(body.health_context)
          : current.health_context || { allergies: [], chronic_conditions: [], medications: [] },
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
