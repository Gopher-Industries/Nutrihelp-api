const fetchUserPreferences = require('../model/fetchUserPreferences');
const updateUserPreferences = require('../model/updateUserPreferences');
const { ServiceError } = require('./serviceError');
const { decryptFromDatabase, encryptForDatabase } = require('./encryptionService');

const USER_PREFERENCES_CONTRACT_VERSION = 'user-preferences-v2';

const DEFAULT_NOTIFICATION_PREFERENCES = {
  mealReminders: true,
  waterReminders: true,
  healthTips: true,
  weeklyReports: false,
  systemUpdates: true
};

const DEFAULT_UI_SETTINGS = {
  language: 'en',
  theme: 'light',
  font_size: '16px'
};

function asTrimmedString(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function normalizeStringArray(items) {
  return Array.isArray(items)
    ? [...new Set(items.map(asTrimmedString).filter(Boolean))]
    : [];
}

function normalizeStructuredAllergy(item = {}) {
  return {
    referenceId: Number.isInteger(item.referenceId) ? item.referenceId : Number.isInteger(item.id) ? item.id : null,
    name: asTrimmedString(item.name),
    severity: ['mild', 'moderate', 'severe', 'unknown'].includes(item.severity) ? item.severity : 'unknown',
    notes: asTrimmedString(item.notes)
  };
}

function normalizeStructuredCondition(item = {}) {
  return {
    referenceId: Number.isInteger(item.referenceId) ? item.referenceId : Number.isInteger(item.id) ? item.id : null,
    name: asTrimmedString(item.name),
    status: ['active', 'managed', 'resolved', 'unknown'].includes(item.status) ? item.status : 'active',
    notes: asTrimmedString(item.notes)
  };
}

function normalizeMedication(item = {}, index = 0) {
  return {
    id: asTrimmedString(item.id) || `medication-${index + 1}`,
    name: asTrimmedString(item.name),
    dosage: {
      amount: asTrimmedString(item.dosage?.amount ?? item.amount),
      unit: asTrimmedString(item.dosage?.unit ?? item.unit)
    },
    frequency: {
      timesPerDay: Number.isInteger(item.frequency?.timesPerDay) ? item.frequency.timesPerDay : null,
      interval: asTrimmedString(item.frequency?.interval),
      schedule: normalizeStringArray(item.frequency?.schedule),
      asNeeded: Boolean(item.frequency?.asNeeded)
    },
    purpose: asTrimmedString(item.purpose),
    notes: asTrimmedString(item.notes),
    active: item.active !== false
  };
}

function buildStructuredHealthContext(rawPreferences = {}) {
  // Week 6: Encryption of allergies and health conditions is handled at the migration
  // and model level (fetchUserPreferences decrypts encrypted rows from user_allergies
  // and user_health_conditions tables via the RPC/query layer)
  const storeHealthContext = rawPreferences.health_context || {};

  const allergiesById = new Map(
    (rawPreferences.allergies || []).map((item) => [item.id, item])
  );
  const conditionsById = new Map(
    (rawPreferences.health_conditions || []).map((item) => [item.id, item])
  );

  const structuredAllergies = (storeHealthContext.allergies || []).map(normalizeStructuredAllergy);
  const structuredConditions = (storeHealthContext.chronic_conditions || []).map(normalizeStructuredCondition);

  const mergedAllergies = (rawPreferences.allergies || []).map((item) => {
    const detail = structuredAllergies.find((entry) => entry.referenceId === item.id) || {};
    return normalizeStructuredAllergy({
      referenceId: item.id,
      name: item.name,
      severity: detail.severity,
      notes: detail.notes
    });
  });

  const mergedConditions = (rawPreferences.health_conditions || []).map((item) => {
    const detail = structuredConditions.find((entry) => entry.referenceId === item.id) || {};
    return normalizeStructuredCondition({
      referenceId: item.id,
      name: item.name,
      status: detail.status,
      notes: detail.notes
    });
  });

  const extraAllergies = structuredAllergies.filter((entry) => entry.referenceId == null || !allergiesById.has(entry.referenceId));
  const extraConditions = structuredConditions.filter((entry) => entry.referenceId == null || !conditionsById.has(entry.referenceId));

  return {
    allergies: [...mergedAllergies, ...extraAllergies],
    chronic_conditions: [...mergedConditions, ...extraConditions],
    medications: (storeHealthContext.medications || []).map(normalizeMedication).filter((item) => item.name),
    normalized_summary: {
      allergyNames: [...new Set([...mergedAllergies, ...extraAllergies].map((item) => item.name).filter(Boolean).map((item) => item.toLowerCase()))],
      chronicConditionNames: [...new Set([...mergedConditions, ...extraConditions].map((item) => item.name).filter(Boolean).map((item) => item.toLowerCase()))],
      activeMedicationNames: [...new Set((storeHealthContext.medications || []).map(normalizeMedication).filter((item) => item.name && item.active).map((item) => item.name.toLowerCase()))]
    }
  };
}

function buildExtendedPreferences(rawPreferences = {}) {
  return {
    success: true,
    contractVersion: USER_PREFERENCES_CONTRACT_VERSION,
    data: {
      food_preferences: {
        dietary_requirements: rawPreferences.dietary_requirements || [],
        cuisines: rawPreferences.cuisines || [],
        dislikes: rawPreferences.dislikes || [],
        spice_levels: rawPreferences.spice_levels || [],
        cooking_methods: rawPreferences.cooking_methods || []
      },
      health_context: buildStructuredHealthContext(rawPreferences),
      notification_preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(rawPreferences.notification_preferences || {})
      },
      ui_settings: {
        ...DEFAULT_UI_SETTINGS,
        ...(rawPreferences.ui_settings || {})
      }
    }
  };
}

async function getExtendedPreferences(userId) {
  if (!userId) {
    throw new ServiceError(400, 'User ID is required');
  }

  const rawPreferences = await fetchUserPreferences(userId);
  return buildExtendedPreferences(rawPreferences);
}

async function updateExtendedPreferences(userId, payload = {}) {
  if (!userId) {
    throw new ServiceError(400, 'User ID is required');
  }

  await updateUserPreferences(userId, payload);
  return getExtendedPreferences(userId);
}

async function getNotificationPreferences(userId) {
  const response = await getExtendedPreferences(userId);
  return {
    success: true,
    data: response.data.notification_preferences
  };
}

async function updateNotificationPreferences(userId, notificationPreferences = {}) {
  if (!userId) {
    throw new ServiceError(400, 'User ID is required');
  }

  await updateUserPreferences(userId, {
    notification_preferences: notificationPreferences
  });

  return getNotificationPreferences(userId);
}

module.exports = {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_UI_SETTINGS,
  USER_PREFERENCES_CONTRACT_VERSION,
  buildExtendedPreferences,
  buildStructuredHealthContext,
  getExtendedPreferences,
  getNotificationPreferences,
  updateExtendedPreferences,
  updateNotificationPreferences
};
