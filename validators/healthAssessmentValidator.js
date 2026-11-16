'use strict';

/**
 * Validation for AI Health Assessment submissions (FE-04).
 *
 * The Joi schema is generated from the questionnaire definition so the rules
 * the user sees in the UI (min, max, options, required) are exactly the rules
 * enforced here. Unknown keys are stripped rather than rejected, so an older
 * frontend sending an extra field does not break, but nothing unvalidated ever
 * reaches the scoring engine, the AI model or the database.
 */

const Joi = require('joi');
const { QUESTIONS } = require('../services/healthAssessment/questionnaire');

function schemaForQuestion(question) {
  let schema;

  switch (question.type) {
  case 'number':
  case 'scale': {
    schema = Joi.number().min(question.min).max(question.max);
    if (question.step === 1 || question.type === 'scale') schema = schema.integer();
    break;
  }
  case 'boolean':
    schema = Joi.boolean().truthy('yes', 'true', 1).falsy('no', 'false', 0);
    break;
  case 'single': {
    const values = question.options.map((option) => option.value);
    const numeric = values.every((value) => typeof value === 'number');
    schema = numeric ? Joi.number().valid(...values) : Joi.string().valid(...values);
    break;
  }
  default:
    throw new Error(`Unsupported question type "${question.type}" for ${question.id}`);
  }

  schema = schema.label(question.label);
  return question.required ? schema.required() : schema.allow(null).optional();
}

const answersSchema = Joi.object(
  Object.fromEntries(QUESTIONS.map((question) => [question.id, schemaForQuestion(question)]))
).options({ stripUnknown: true });

const submissionSchema = Joi.object({
  answers: answersSchema.required(),
  consent: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the assessment terms before submitting.',
    'any.required': 'You must agree to the assessment terms before submitting.',
  }),
  save: Joi.boolean().default(true),
}).options({ stripUnknown: true });

/**
 * Cross-field rules that a per-field schema cannot express.
 */
function crossFieldIssues(answers) {
  const issues = [];
  const heightM = answers.heightCm / 100;
  const bmi = answers.weightKg / (heightM * heightM);

  if (bmi < 10 || bmi > 90) {
    issues.push({
      field: 'weightKg',
      message: 'Height and weight together give an implausible BMI. Please check both values.',
    });
  }

  if (answers.targetWeightKg) {
    const targetBmi = answers.targetWeightKg / (heightM * heightM);
    if (targetBmi < 15) {
      issues.push({
        field: 'targetWeightKg',
        message: 'This target weight would be dangerously low for your height.',
      });
    }
  }

  return issues;
}

/**
 * @returns {{ value?: object, errors?: Array<{field: string, message: string}> }}
 */
function validateSubmission(body) {
  const { value, error } = submissionSchema.validate(body || {}, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return {
      errors: error.details.map((detail) => ({
        field: detail.path[detail.path.length - 1] || detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      })),
    };
  }

  const issues = crossFieldIssues(value.answers);
  if (issues.length) return { errors: issues };

  return { value };
}

module.exports = { validateSubmission, submissionSchema };
