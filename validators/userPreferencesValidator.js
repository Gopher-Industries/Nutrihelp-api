const { body } = require('express-validator');

const ALLERGY_SEVERITIES = ['mild', 'moderate', 'severe', 'unknown'];
const CONDITION_STATUSES = ['active', 'managed', 'resolved', 'unknown'];
const UI_THEMES = ['light', 'dark'];
const UI_LANGUAGES = ['en', 'zh', 'es', 'fr', 'de'];

const isArrayOfIntegers = (value) =>
  Array.isArray(value) && value.every(Number.isInteger);

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isPreferenceReference(value) {
  if (isPositiveInteger(value)) return true;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const hasId = Object.prototype.hasOwnProperty.call(value, 'id');
    const hasReferenceId = Object.prototype.hasOwnProperty.call(value, 'referenceId');
    if (!hasId && !hasReferenceId) return false;
    if (hasId && !isPositiveInteger(value.id)) return false;
    if (hasReferenceId && !isPositiveInteger(value.referenceId)) return false;
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Flat food-preference ID arrays (integers only)
// ─────────────────────────────────────────────────────────────────────────────
function buildIntegerArrayRule(field, required) {
  const chain = body(field);
  if (required) {
    chain.exists({ checkNull: true }).withMessage(`${field} is required`).bail();
  } else {
    chain.optional();
  }
  return chain.custom(isArrayOfIntegers).withMessage(`${field} must be an array of integers`);
}

const requiredFoodPreferenceRules = [
  buildIntegerArrayRule('dietary_requirements', true),
  buildIntegerArrayRule('allergies', true),
  buildIntegerArrayRule('cuisines', true),
  buildIntegerArrayRule('dislikes', true),
  buildIntegerArrayRule('health_conditions', true),
  buildIntegerArrayRule('spice_levels', true),
  buildIntegerArrayRule('cooking_methods', true),
];

const optionalFoodPreferenceRules = [
  buildIntegerArrayRule('dietary_requirements', false),
  buildIntegerArrayRule('allergies', false),
  buildIntegerArrayRule('cuisines', false),
  buildIntegerArrayRule('dislikes', false),
  buildIntegerArrayRule('health_conditions', false),
  buildIntegerArrayRule('spice_levels', false),
  buildIntegerArrayRule('cooking_methods', false),
];

// ─────────────────────────────────────────────────────────────────────────────
// Nested food_preferences object
// Accepts positive integers OR { id: positiveInt } OR { referenceId: positiveInt }
// ─────────────────────────────────────────────────────────────────────────────
function buildPreferenceReferenceArrayRule(field) {
  return body(field)
    .optional()
    .custom((value) => {
      if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
      if (!value.every(isPreferenceReference)) {
        throw new Error(
          `${field} must be an array of positive integer IDs or objects with positive integer id/referenceId`
        );
      }
      return true;
    });
}

const nestedFoodPreferenceRules = [
  body('food_preferences')
    .optional()
    .isObject().withMessage('food_preferences must be an object'),
  buildPreferenceReferenceArrayRule('food_preferences.dietary_requirements'),
  buildPreferenceReferenceArrayRule('food_preferences.allergies'),
  buildPreferenceReferenceArrayRule('food_preferences.cuisines'),
  buildPreferenceReferenceArrayRule('food_preferences.dislikes'),
  buildPreferenceReferenceArrayRule('food_preferences.health_conditions'),
  buildPreferenceReferenceArrayRule('food_preferences.spice_levels'),
  buildPreferenceReferenceArrayRule('food_preferences.cooking_methods'),
];

// ─────────────────────────────────────────────────────────────────────────────
// health_context structured object
// ─────────────────────────────────────────────────────────────────────────────
const healthContextRules = [
  body('health_context')
    .optional()
    .isObject().withMessage('health_context must be an object'),

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

  body('health_context.medications')
    .optional()
    .isArray().withMessage('health_context.medications must be an array'),
  body('health_context.medications.*.name')
    .optional()
    .isString().notEmpty().withMessage('medication name must be a non-empty string')
    .isLength({ max: 200 }).withMessage('medication name must be 200 characters or fewer'),
  body('health_context.medications.*.dosage')
    .optional({ nullable: true })
    .isObject().withMessage('medication dosage must be an object'),
  body('health_context.medications.*.dosage.amount')
    .optional({ nullable: true })
    .isString().withMessage('dosage amount must be a string'),
  body('health_context.medications.*.dosage.unit')
    .optional({ nullable: true })
    .isString().withMessage('dosage unit must be a string'),
  body('health_context.medications.*.frequency')
    .optional({ nullable: true })
    .isObject().withMessage('medication frequency must be an object'),
  body('health_context.medications.*.frequency.timesPerDay')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 24 }).withMessage('timesPerDay must be an integer between 1 and 24'),
  body('health_context.medications.*.frequency.schedule')
    .optional({ nullable: true })
    .isArray().withMessage('frequency schedule must be an array'),
  body('health_context.medications.*.frequency.asNeeded')
    .optional({ nullable: true })
    .isBoolean().withMessage('asNeeded must be a boolean'),
  body('health_context.medications.*.purpose')
    .optional({ nullable: true })
    .isString().withMessage('medication purpose must be a string')
    .isLength({ max: 500 }).withMessage('medication purpose must be 500 characters or fewer'),
  body('health_context.medications.*.notes')
    .optional({ nullable: true })
    .isString().withMessage('medication notes must be a string')
    .isLength({ max: 1000 }).withMessage('medication notes must be 1000 characters or fewer'),
  body('health_context.medications.*.active')
    .optional({ nullable: true })
    .isBoolean().withMessage('medication active must be a boolean'),
];

// ─────────────────────────────────────────────────────────────────────────────
// ui_settings
// ─────────────────────────────────────────────────────────────────────────────
const uiSettingsRules = [
  body('ui_settings')
    .optional()
    .isObject().withMessage('ui_settings must be an object'),
  body('ui_settings.theme')
    .optional()
    .isIn(UI_THEMES).withMessage(`ui_settings.theme must be one of: ${UI_THEMES.join(', ')}`),
  body('ui_settings.language')
    .optional()
    .isIn(UI_LANGUAGES).withMessage(`ui_settings.language must be one of: ${UI_LANGUAGES.join(', ')}`),
  body('ui_settings.font_size')
    .optional()
    .matches(/^\d+px$/).withMessage('ui_settings.font_size must be in the format "16px"'),
];

// ─────────────────────────────────────────────────────────────────────────────
// notification_preferences
// ─────────────────────────────────────────────────────────────────────────────
const notificationPreferencesRules = [
  body('notification_preferences')
    .exists({ checkNull: true }).withMessage('notification_preferences is required')
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

// ─────────────────────────────────────────────────────────────────────────────
// Extended preferences — at least one section required
// ─────────────────────────────────────────────────────────────────────────────
const EXTENDED_SECTIONS = [
  'health_context',
  'food_preferences',
  'notification_preferences',
  'ui_settings',
  'dietary_requirements',
  'allergies',
  'cuisines',
  'dislikes',
  'health_conditions',
  'spice_levels',
  'cooking_methods',
];

function atLeastOneSectionRequired(req, res, next) {
  const hasAny = EXTENDED_SECTIONS.some((key) =>
    Object.prototype.hasOwnProperty.call(req.body, key)
  );
  if (!hasAny) {
    return res.status(400).json({
      success: false,
      errors: [{ msg: 'At least one preference section must be provided' }],
    });
  }
  return next();
}

const validateExtendedUserPreferences = [
  atLeastOneSectionRequired,
  ...healthContextRules,
  ...nestedFoodPreferenceRules,
  ...uiSettingsRules,
];

const validateUiSettings = [
  ...uiSettingsRules,
];

const validateNotificationPreferences = [
  ...notificationPreferencesRules,
];

const validateUserPreferences = requiredFoodPreferenceRules;
const validateOptionalUserPreferences = optionalFoodPreferenceRules;

module.exports = {
  validateUserPreferences,
  validateOptionalUserPreferences,
  validateExtendedUserPreferences,
  validateUiSettings,
  validateNotificationPreferences,
};
