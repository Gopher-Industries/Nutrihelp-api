const { body } = require('express-validator');

const ALLERGY_SEVERITIES = ['mild', 'moderate', 'severe', 'unknown'];
const CONDITION_STATUSES = ['active', 'managed', 'resolved', 'unknown'];
const UI_THEMES = ['light', 'dark'];
const UI_LANGUAGES = ['en', 'zh', 'es', 'fr', 'de'];

const isArrayOfIntegers = (value) =>
  Array.isArray(value) && value.every(Number.isInteger);

// ─────────────────────────────────────────────────────────────────────────────
// Shared: flat food-preference ID arrays
// ─────────────────────────────────────────────────────────────────────────────
const foodPreferenceRules = [
  body('dietary_requirements')
    .optional()
    .custom(isArrayOfIntegers).withMessage('dietary_requirements must be an array of integers'),
  body('allergies')
    .optional()
    .custom(isArrayOfIntegers).withMessage('allergies must be an array of integers'),
  body('cuisines')
    .optional()
    .custom(isArrayOfIntegers).withMessage('cuisines must be an array of integers'),
  body('dislikes')
    .optional()
    .custom(isArrayOfIntegers).withMessage('dislikes must be an array of integers'),
  body('health_conditions')
    .optional()
    .custom(isArrayOfIntegers).withMessage('health_conditions must be an array of integers'),
  body('spice_levels')
    .optional()
    .custom(isArrayOfIntegers).withMessage('spice_levels must be an array of integers'),
  body('cooking_methods')
    .optional()
    .custom(isArrayOfIntegers).withMessage('cooking_methods must be an array of integers'),
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared: health_context structured object
// ─────────────────────────────────────────────────────────────────────────────
const healthContextRules = [
  body('health_context')
    .optional()
    .isObject().withMessage('health_context must be an object'),

  // allergies[]
  body('health_context.allergies')
    .optional()
    .isArray().withMessage('health_context.allergies must be an array'),
  body('health_context.allergies.*.referenceId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('allergy referenceId must be a positive integer'),
  body('health_context.allergies.*.name')
    .optional({ nullable: true })
    .isString().withMessage('allergy name must be a string')
    .isLength({ max: 200 }).withMessage('allergy name must be 200 characters or fewer'),
  body('health_context.allergies.*.severity')
    .optional()
    .isIn(ALLERGY_SEVERITIES)
    .withMessage(`allergy severity must be one of: ${ALLERGY_SEVERITIES.join(', ')}`),
  body('health_context.allergies.*.notes')
    .optional({ nullable: true })
    .isString().withMessage('allergy notes must be a string')
    .isLength({ max: 1000 }).withMessage('allergy notes must be 1000 characters or fewer'),

  // chronic_conditions[]
  body('health_context.chronic_conditions')
    .optional()
    .isArray().withMessage('health_context.chronic_conditions must be an array'),
  body('health_context.chronic_conditions.*.referenceId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('condition referenceId must be a positive integer'),
  body('health_context.chronic_conditions.*.name')
    .optional({ nullable: true })
    .isString().withMessage('condition name must be a string')
    .isLength({ max: 200 }).withMessage('condition name must be 200 characters or fewer'),
  body('health_context.chronic_conditions.*.status')
    .optional()
    .isIn(CONDITION_STATUSES)
    .withMessage(`condition status must be one of: ${CONDITION_STATUSES.join(', ')}`),
  body('health_context.chronic_conditions.*.notes')
    .optional({ nullable: true })
    .isString().withMessage('condition notes must be a string')
    .isLength({ max: 1000 }).withMessage('condition notes must be 1000 characters or fewer'),

  // medications[]
  body('health_context.medications')
    .optional()
    .isArray().withMessage('health_context.medications must be an array'),
  body('health_context.medications.*.name')
    .if(body('health_context.medications').exists())
    .notEmpty().withMessage('medication name is required')
    .isString().withMessage('medication name must be a string')
    .isLength({ max: 200 }).withMessage('medication name must be 200 characters or fewer'),
  body('health_context.medications.*.dosage')
    .optional()
    .isObject().withMessage('medication dosage must be an object'),
  body('health_context.medications.*.dosage.amount')
    .optional({ nullable: true })
    .isString().withMessage('dosage amount must be a string')
    .isLength({ max: 50 }).withMessage('dosage amount must be 50 characters or fewer'),
  body('health_context.medications.*.dosage.unit')
    .optional({ nullable: true })
    .isString().withMessage('dosage unit must be a string')
    .isLength({ max: 50 }).withMessage('dosage unit must be 50 characters or fewer'),
  body('health_context.medications.*.frequency')
    .optional()
    .isObject().withMessage('medication frequency must be an object'),
  body('health_context.medications.*.frequency.timesPerDay')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 24 })
    .withMessage('frequency timesPerDay must be an integer between 1 and 24'),
  body('health_context.medications.*.frequency.interval')
    .optional({ nullable: true })
    .isString().withMessage('frequency interval must be a string')
    .isLength({ max: 100 }).withMessage('frequency interval must be 100 characters or fewer'),
  body('health_context.medications.*.frequency.schedule')
    .optional()
    .isArray().withMessage('frequency schedule must be an array'),
  body('health_context.medications.*.frequency.schedule.*')
    .optional()
    .isString().withMessage('each schedule entry must be a string')
    .isLength({ max: 50 }).withMessage('each schedule entry must be 50 characters or fewer'),
  body('health_context.medications.*.frequency.asNeeded')
    .optional()
    .isBoolean().withMessage('frequency asNeeded must be a boolean'),
  body('health_context.medications.*.purpose')
    .optional({ nullable: true })
    .isString().withMessage('medication purpose must be a string')
    .isLength({ max: 500 }).withMessage('medication purpose must be 500 characters or fewer'),
  body('health_context.medications.*.notes')
    .optional({ nullable: true })
    .isString().withMessage('medication notes must be a string')
    .isLength({ max: 1000 }).withMessage('medication notes must be 1000 characters or fewer'),
  body('health_context.medications.*.active')
    .optional()
    .isBoolean().withMessage('medication active must be a boolean'),
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared: ui_settings
// ─────────────────────────────────────────────────────────────────────────────
const uiSettingsRules = [
  body('ui_settings')
    .optional()
    .isObject().withMessage('ui_settings must be an object'),
  body('ui_settings.language')
    .optional()
    .isIn(UI_LANGUAGES)
    .withMessage(`ui_settings.language must be one of: ${UI_LANGUAGES.join(', ')}`),
  body('ui_settings.theme')
    .optional()
    .isIn(UI_THEMES)
    .withMessage(`ui_settings.theme must be one of: ${UI_THEMES.join(', ')}`),
  body('ui_settings.font_size')
    .optional()
    .isString().withMessage('ui_settings.font_size must be a string')
    .matches(/^\d+(px|rem|em|%)$/)
    .withMessage('ui_settings.font_size must be a valid CSS size (e.g. 16px, 1rem)'),
];

// ─────────────────────────────────────────────────────────────────────────────
// validateUserPreferences
// POST /api/user/preferences — flat food-preference ID arrays + health_context
// ─────────────────────────────────────────────────────────────────────────────
exports.validateUserPreferences = [
  body('user')
    .notEmpty().withMessage('User object is required')
    .isObject().withMessage('User must be an object'),
  body('user.userId')
    .notEmpty().withMessage('User ID is required')
    .isInt().withMessage('User ID must be an integer'),
  ...foodPreferenceRules,
  ...healthContextRules,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateHealthContext
// PUT /api/user/preferences/extended — full structured health-context update
// ─────────────────────────────────────────────────────────────────────────────
exports.validateHealthContext = [
  ...healthContextRules,
  ...foodPreferenceRules,
  ...uiSettingsRules,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateNotificationPreferences
// PUT /api/user/preferences/extended/notifications
// ─────────────────────────────────────────────────────────────────────────────
exports.validateNotificationPreferences = [
  body('notification_preferences')
    .notEmpty().withMessage('notification_preferences object is required')
    .isObject().withMessage('notification_preferences must be an object'),
  body('notification_preferences.mealReminders')
    .optional()
    .isBoolean().withMessage('mealReminders must be a boolean'),
  body('notification_preferences.waterReminders')
    .optional()
    .isBoolean().withMessage('waterReminders must be a boolean'),
  body('notification_preferences.healthTips')
    .optional()
    .isBoolean().withMessage('healthTips must be a boolean'),
  body('notification_preferences.weeklyReports')
    .optional()
    .isBoolean().withMessage('weeklyReports must be a boolean'),
  body('notification_preferences.systemUpdates')
    .optional()
    .isBoolean().withMessage('systemUpdates must be a boolean'),
];
