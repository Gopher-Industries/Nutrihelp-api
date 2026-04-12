const supabase = require("../dbConnection.js");

const PREFERENCE_STATE_TABLE = "user_preference_states";

const EMPTY_HEALTH_CONTEXT = {
  allergies: [],
  chronic_conditions: [],
  medications: [],
};

const EMPTY_NOTIFICATION_PREFERENCES = {};
const EMPTY_UI_SETTINGS = {};

function normalizeHealthContext(healthContext = {}) {
  return {
    allergies: Array.isArray(healthContext?.allergies) ? healthContext.allergies : [],
    chronic_conditions: Array.isArray(healthContext?.chronic_conditions)
      ? healthContext.chronic_conditions
      : [],
    medications: Array.isArray(healthContext?.medications) ? healthContext.medications : [],
  };
}

function normalizeNotificationPreferences(preferences = {}) {
  return typeof preferences === "object" && preferences !== null
    ? preferences
    : EMPTY_NOTIFICATION_PREFERENCES;
}

function normalizeUiSettings(settings = {}) {
  return typeof settings === "object" && settings !== null ? settings : EMPTY_UI_SETTINGS;
}

function buildPreferenceState(row = {}) {
  return {
    health_context: normalizeHealthContext(row.health_context || EMPTY_HEALTH_CONTEXT),
    notification_preferences: normalizeNotificationPreferences(
      row.notification_preferences || EMPTY_NOTIFICATION_PREFERENCES
    ),
    ui_settings: normalizeUiSettings(row.ui_settings || EMPTY_UI_SETTINGS),
  };
}

async function getUserPreferenceState(userId) {
  const { data, error } = await supabase
    .from(PREFERENCE_STATE_TABLE)
    .select("health_context, notification_preferences, ui_settings")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return buildPreferenceState(data || {});
}

async function saveUserPreferenceState(userId, updater) {
  const current = await getUserPreferenceState(userId);
  const nextValue = typeof updater === "function" ? updater(current) : updater;
  const normalized = buildPreferenceState(nextValue);

  const payload = {
    user_id: userId,
    health_context: normalized.health_context,
    notification_preferences: normalized.notification_preferences,
    ui_settings: normalized.ui_settings,
  };

  const { data, error } = await supabase
    .from(PREFERENCE_STATE_TABLE)
    .upsert(payload, { onConflict: "user_id" })
    .select("health_context, notification_preferences, ui_settings")
    .single();

  if (error) {
    throw error;
  }

  return buildPreferenceState(data);
}

module.exports = {
  EMPTY_HEALTH_CONTEXT,
  EMPTY_NOTIFICATION_PREFERENCES,
  EMPTY_UI_SETTINGS,
  buildPreferenceState,
  getUserPreferenceState,
  saveUserPreferenceState,
};
