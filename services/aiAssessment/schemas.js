'use strict';

/**
 * Joi schemas for the AI Assessment Prediction Contract (FE-06).
 *
 * The request schema is generated from the shared INPUT_FIELDS list, so the
 * rules the mobile form shows and the rules the API enforces cannot drift.
 * The response schema is the executable form of the contract: tests validate
 * every gateway outcome and every shared fixture against it.
 */

const Joi = require('joi');
const { CONTRACT_VERSION, ENUMS, INPUT_FIELDS } = require('../../contracts/ai-assessment/v1');

function fieldSchema(field) {
  let schema;
  switch (field.type) {
  case 'enum':
    schema = Joi.string().valid(...field.values);
    break;
  case 'boolean':
    schema = Joi.boolean();
    break;
  case 'integer':
    schema = Joi.number().integer().min(field.min).max(field.max);
    break;
  case 'number':
    schema = Joi.number().min(field.min).max(field.max);
    break;
  default:
    throw new Error(`Unsupported field type "${field.type}" for ${field.id}`);
  }
  return field.required ? schema.required() : schema.optional();
}

const inputsSchema = Joi.object(
  Object.fromEntries(INPUT_FIELDS.map((field) => [field.id, fieldSchema(field)]))
).unknown(false);

const requestSchema = Joi.object({
  contractVersion: Joi.string().optional(),
  inputs: inputsSchema.required(),
});

const nullableConfidence = Joi.number().min(0).max(1).allow(null).required();

const predictionSchema = Joi.object({
  status: Joi.string().valid(...ENUMS.predictionStatus).required(),
  source: Joi.string().valid(...ENUMS.predictionSource).required(),
  uncertain: Joi.boolean().required(),
  bmi: Joi.number().min(5).max(120).required(),
  weightCategory: Joi.object({
    code: Joi.string().valid(...ENUMS.weightCategory).required(),
    label: Joi.string().required(),
    modelLabel: Joi.string().allow(null).required(),
    confidence: nullableConfidence,
    agreesWithBmi: Joi.boolean().allow(null).required(),
  }).required(),
  diabetes: Joi.object({
    positive: Joi.boolean().allow(null).required(),
    riskLevel: Joi.string().valid(...ENUMS.diabetesRiskLevel).allow(null).required(),
    probability: nullableConfidence,
    confidence: nullableConfidence,
  })
    .allow(null)
    .required(),
});

const successDataSchema = Joi.object({
  prediction: predictionSchema.required(),
  model: Joi.object({
    name: Joi.string().required(),
    version: Joi.string().required(),
  })
    .allow(null)
    .required(),
  explainability: Joi.object({
    service: Joi.string().valid('assessment_prediction').required(),
    source: Joi.string().valid(...ENUMS.predictionSource).required(),
    fallbackUsed: Joi.boolean().required(),
    timedOut: Joi.boolean().required(),
    circuitOpen: Joi.boolean().required(),
    durationMs: Joi.number().integer().min(0).required(),
    confidenceThreshold: Joi.number().min(0).max(1).required(),
    warnings: Joi.array().items(Joi.string().valid(...ENUMS.warning)).required(),
    generatedAt: Joi.string().isoDate().required(),
    contractVersion: Joi.string().valid(CONTRACT_VERSION).required(),
  }).required(),
  disclaimer: Joi.string().required(),
});

const successBodySchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: successDataSchema.required(),
  meta: Joi.object({ contractVersion: Joi.string().valid(CONTRACT_VERSION).required() }).unknown(true),
});

const errorBodySchema = Joi.object({
  success: Joi.boolean().valid(false).required(),
  error: Joi.string().required(),
  code: Joi.string().required(),
  errors: Joi.array().items(Joi.object({ field: Joi.string().required(), message: Joi.string().required() })),
}).unknown(true);

/**
 * Validate a predict request body.
 * @returns {{ value?: object, errors?: Array<{field: string, message: string}> }}
 */
function validateRequest(body) {
  const { value, error } = requestSchema.validate(body || {}, { abortEarly: false, convert: false });
  if (error) {
    return {
      errors: error.details.map((detail) => ({
        field: detail.path[detail.path.length - 1] != null ? String(detail.path[detail.path.length - 1]) : 'body',
        message: detail.message.replace(/"/g, ''),
      })),
    };
  }
  return { value };
}

module.exports = {
  inputsSchema,
  requestSchema,
  predictionSchema,
  successDataSchema,
  successBodySchema,
  errorBodySchema,
  validateRequest,
};
