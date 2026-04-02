const { body, query } = require("express-validator");

const supportedSources = ["apple_health", "google_fit", "fitbit", "garmin", "samsung_health", "manual", "other"];
const supportedMetrics = ["steps", "heart_rate", "sleep_duration", "calories_burned"];

const validateWearablePayload = [
  body("source")
    .notEmpty()
    .withMessage("source is required")
    .isString()
    .withMessage("source must be a string")
    .customSanitizer((value) => String(value).trim().toLowerCase())
    .isIn(supportedSources)
    .withMessage(`source must be one of: ${supportedSources.join(", ")}`),

  body("recorded_at")
    .notEmpty()
    .withMessage("recorded_at is required")
    .isISO8601()
    .withMessage("recorded_at must be a valid ISO-8601 timestamp"),

  body("timezone")
    .optional()
    .isString()
    .withMessage("timezone must be a string"),

  body("device")
    .optional()
    .isObject()
    .withMessage("device must be an object"),

  body("device.id")
    .optional()
    .isString()
    .withMessage("device.id must be a string"),

  body("device.name")
    .optional()
    .isString()
    .withMessage("device.name must be a string"),

  body("metrics")
    .notEmpty()
    .withMessage("metrics is required")
    .isObject()
    .withMessage("metrics must be an object")
    .custom((metrics) => {
      const presentMetrics = Object.keys(metrics || {}).filter((key) => supportedMetrics.includes(key));
      if (!presentMetrics.length) {
        throw new Error(`At least one supported metric is required: ${supportedMetrics.join(", ")}`);
      }
      return true;
    }),

  ...supportedMetrics.flatMap((metricKey) => ([
    body(`metrics.${metricKey}`)
      .optional()
      .isObject()
      .withMessage(`${metricKey} must be an object`),
    body(`metrics.${metricKey}.value`)
      .optional()
      .isNumeric()
      .withMessage(`${metricKey}.value must be numeric`),
    body(`metrics.${metricKey}.unit`)
      .optional()
      .isString()
      .withMessage(`${metricKey}.unit must be a string`),
  ])),
];

const validateWearableQuery = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be an integer between 1 and 100"),
];

module.exports = {
  validateWearablePayload,
  validateWearableQuery,
};
