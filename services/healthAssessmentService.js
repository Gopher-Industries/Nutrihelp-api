'use strict';

/**
 * AI Health Assessment service (FE-04).
 *
 * Orchestrates one assessment:
 *
 *   validated answers
 *        │
 *        ├─► scoringEngine.assess()          deterministic scores, targets, flags
 *        │
 *        ├─► aiInsights.getModelPredictions() NutriHelp AI model   ┐ run in
 *        ├─► aiInsights.getNarrative()        LLM summary          ┘ parallel
 *        │
 *        ├─► compare with the user's previous assessment
 *        └─► persist (encrypted) unless the user opted out
 *
 * Dependencies are injectable so the whole flow is unit-testable without a
 * database, an AI server or an LLM key.
 */

const logger = require('../utils/logger');
const { ServiceError } = require('./serviceError');
const scoringEngine = require('./healthAssessment/scoringEngine');
const aiInsights = require('./healthAssessment/aiInsights');
const {
  getQuestionnaire,
  toPlanSurvey,
  QUESTIONNAIRE_VERSION,
} = require('./healthAssessment/questionnaire');

const DISCLAIMER = getQuestionnaire().disclaimer;

const BMI_KEY_TO_OBESITY_LEVEL = {
  underweight: 'Insufficient_Weight',
  healthy: 'Normal_Weight',
  overweight: 'Overweight_Level_I',
  obese_1: 'Obesity_Type_I',
  obese_2: 'Obesity_Type_II',
  obese_3: 'Obesity_Type_III',
};

/**
 * Body for POST /api/medical-report/plan. Uses the AI model's predictions when
 * they were available, otherwise the rules-engine equivalents.
 */
function buildPlanRequest(answers, result, model) {
  const obesityLevel =
    (model?.available && model.obesity?.level) || BMI_KEY_TO_OBESITY_LEVEL[result.body.bmiCategory.key];

  const diabetes =
    model?.available && model.diabetes
      ? model.diabetes.positive
      : result.diabetesRisk.level.key === 'high';

  return {
    medical_report: [
      {
        bmi: result.body.bmi,
        obesity_prediction: {
          obesity_level: obesityLevel,
          confidence: (model?.available && model.obesity?.confidence) || 80,
        },
        diabetes_prediction: {
          diabetes,
          confidence: (model?.available && model.diabetes?.confidence) || 75,
        },
      },
    ],
    survey_data: toPlanSurvey(answers),
  };
}

function buildComparison(previous, result) {
  if (!previous) return null;
  const previousScore = Number(previous.overallScore);
  const delta = result.overall.score - previousScore;
  return {
    previousId: previous.id,
    previousDate: previous.createdAt,
    previousScore,
    delta,
    trend: delta > 2 ? 'improved' : delta < -2 ? 'declined' : 'steady',
  };
}

function createHealthAssessmentService(deps = {}) {
  const repository =
    deps.repository || require('../repositories/healthAssessmentRepository').healthAssessmentRepository;
  const engine = deps.engine || scoringEngine;
  const ai = deps.ai || aiInsights;
  const now = deps.now || (() => new Date());

  async function safePrevious(userId) {
    try {
      const [latest] = await repository.listForUser(userId, { limit: 1 });
      return latest || null;
    } catch (error) {
      logger.warn('Health assessment: could not load previous assessment', { reason: error.message });
      return null;
    }
  }

  return {
    getQuestionnaire,

    async submit(userId, { answers, save = true }) {
      const result = engine.assess(answers);

      const [model, narrative, previous] = await Promise.all([
        ai.getModelPredictions(answers, result),
        ai.getNarrative(result, answers),
        userId ? safePrevious(userId) : Promise.resolve(null),
      ]);

      const assessment = {
        questionnaireVersion: QUESTIONNAIRE_VERSION,
        answers,
        result,
        ai: { model, narrative },
        planRequest: buildPlanRequest(answers, result, model),
      };

      let summary = null;
      let persistError = null;
      if (save && userId) {
        try {
          summary = await repository.create(userId, assessment);
        } catch (error) {
          // A storage failure must not cost the user their result.
          persistError = 'Your result could not be saved to your history. You can still view and print it now.';
          logger.error('Health assessment: failed to persist assessment', { reason: error.message });
        }
      }

      return {
        id: summary?.id || null,
        createdAt: summary?.createdAt || now().toISOString(),
        persisted: Boolean(summary),
        persistError,
        ...assessment,
        comparison: buildComparison(previous, result),
        disclaimer: DISCLAIMER,
      };
    },

    async history(userId, { limit } = {}) {
      const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);
      const items = await repository.listForUser(userId, { limit: safeLimit });
      // Oldest first is the natural order for a trend chart.
      const trend = [...items].reverse().map((item) => ({
        id: item.id,
        date: item.createdAt,
        score: item.overallScore,
      }));
      return {
        items,
        trend,
        stats: items.length
          ? {
            count: items.length,
            latestScore: items[0].overallScore,
            bestScore: Math.max(...items.map((i) => i.overallScore)),
            changeSinceFirst: items[0].overallScore - items[items.length - 1].overallScore,
          }
          : { count: 0 },
      };
    },

    async getById(userId, id) {
      const assessment = await repository.findForUser(userId, id);
      if (!assessment) throw new ServiceError(404, 'Assessment not found');
      return { ...assessment, persisted: true, disclaimer: DISCLAIMER };
    },

    async getLatest(userId) {
      const assessment = await repository.findLatestForUser(userId);
      return assessment ? { ...assessment, persisted: true, disclaimer: DISCLAIMER } : null;
    },

    async remove(userId, id) {
      const deleted = await repository.deleteForUser(userId, id);
      if (!deleted) throw new ServiceError(404, 'Assessment not found');
      return { id, deleted: true };
    },
  };
}

module.exports = {
  createHealthAssessmentService,
  buildPlanRequest,
  buildComparison,
};
