const supabase = require('../dbConnection.js');
const {
  encryptForDatabase,
  decryptFromDatabase,
} = require('../services/encryptionService');

const PREFERENCE_STATE_TABLE = 'user_preference_states';

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
  return typeof preferences === 'object' && preferences !== null
    ? preferences
    : EMPTY_NOTIFICATION_PREFERENCES;
}

function normalizeUiSettings(settings = {}) {
  return typeof settings === 'object' && settings !== null
    ? settings
    : EMPTY_UI_SETTINGS;
}

function buildPreferenceState(row = {}, healthContext = undefined) {
  const resolvedHealthContext =
    healthContext !== undefined ? healthContext : row.health_context;

  return {
    health_context: normalizeHealthContext(
      resolvedHealthContext || EMPTY_HEALTH_CONTEXT
    ),
    notification_preferences: normalizeNotificationPreferences(
      row.notification_preferences || EMPTY_NOTIFICATION_PREFERENCES
    ),
    ui_settings: normalizeUiSettings(
      row.ui_settings || EMPTY_UI_SETTINGS
    ),
  };
}

function hasAnyEncryptedHealthContextField(row = {}) {
  return [
    row.health_context_encrypted,
    row.health_context_encryption_iv,
    row.health_context_encryption_auth_tag,
    row.health_context_encryption_key_version,
    row.health_context_encrypted_at,
  ].some((value) => value !== null && value !== undefined);
}

function hasCompleteEncryptedHealthContext(row = {}) {
  return Boolean(
    row.health_context_encrypted &&
    row.health_context_encryption_iv &&
    row.health_context_encryption_auth_tag &&
    row.health_context_encryption_key_version &&
    row.health_context_encrypted_at
  );
}

async function resolveHealthContext(row = {}) {
  if (hasAnyEncryptedHealthContextField(row)) {
    if (!hasCompleteEncryptedHealthContext(row)) {
      throw new Error(
        'Incomplete encrypted health_context payload; refusing plaintext fallback.'
      );
    }

    const decrypted = await decryptFromDatabase(row, {
      encrypted: 'health_context_encrypted',
      iv: 'health_context_encryption_iv',
      authTag: 'health_context_encryption_auth_tag',
    });

    if (!decrypted || typeof decrypted !== 'object') {
      throw new Error('Decrypted health_context payload is invalid.');
    }

    return normalizeHealthContext(decrypted);
  }

  // Legacy compatibility: rows created before CS-17 may still contain
  // plaintext health_context until the migration/back-fill is performed.
  return normalizeHealthContext(row.health_context || EMPTY_HEALTH_CONTEXT);
}

async function getUserPreferenceState(userId) {
  const { data, error } = await supabase
    .from(PREFERENCE_STATE_TABLE)
    .select(
      'health_context, health_context_encrypted, health_context_encryption_iv, health_context_encryption_auth_tag, health_context_encryption_key_version, health_context_encrypted_at, notification_preferences, ui_settings'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return buildPreferenceState({});
  }

  const healthContext = await resolveHealthContext(data);
  return buildPreferenceState(data, healthContext);
}

async function saveUserPreferenceState(userId, updater) {
  const current = await getUserPreferenceState(userId);
  const nextValue = typeof updater === 'function' ? updater(current) : updater;
  const normalized = buildPreferenceState(nextValue);

  // Encryption is mandatory for health_context writes. If encryption fails,
  // the write is rejected so sensitive health information is never persisted
  // to the plaintext health_context column.
  const encryptedHealthContext = await encryptForDatabase(
    normalized.health_context
  );

  const payload = {
    user_id: userId,

    health_context: null,
    health_context_encrypted: encryptedHealthContext.encrypted,
    health_context_encryption_iv: encryptedHealthContext.iv,
    health_context_encryption_auth_tag: encryptedHealthContext.authTag,
    health_context_encryption_key_version: encryptedHealthContext.keyVersion,
    health_context_encrypted_at: new Date().toISOString(),

    notification_preferences: normalized.notification_preferences,
    ui_settings: normalized.ui_settings,
  };

  const { data, error } = await supabase
    .from(PREFERENCE_STATE_TABLE)
    .upsert(payload, { onConflict: 'user_id' })
    .select(
      'health_context, health_context_encrypted, health_context_encryption_iv, health_context_encryption_auth_tag, health_context_encryption_key_version, health_context_encrypted_at, notification_preferences, ui_settings'
    )
    .single();

  if (error) {
    throw error;
  }

  const healthContext = await resolveHealthContext(data);
  return buildPreferenceState(data, healthContext);
}

module.exports = {
  EMPTY_HEALTH_CONTEXT,
  EMPTY_NOTIFICATION_PREFERENCES,
  EMPTY_UI_SETTINGS,
  buildPreferenceState,
  getUserPreferenceState,
  normalizeHealthContext,
  resolveHealthContext,
  saveUserPreferenceState,
};
