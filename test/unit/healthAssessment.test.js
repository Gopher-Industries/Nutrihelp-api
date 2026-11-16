/**
 * FE-04 AI Health Assessment: engine, validator, AI layer and service tests.
 * Runs offline: no database, AI server or LLM key is needed.
 */
const { expect } = require('chai');

const engine = require('../../services/healthAssessment/scoringEngine');
const ai = require('../../services/healthAssessment/aiInsights');
const { getQuestionnaire, toAiSurvey, toPlanSurvey, QUESTIONS } = require('../../services/healthAssessment/questionnaire');
const { validateSubmission } = require('../../validators/healthAssessmentValidator');
const { createHealthAssessmentService, buildComparison } = require('../../services/healthAssessmentService');

const healthyAnswers = () => ({
  gender: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  waistCm: 72,
  vegetableFrequency: 3,
  mainMeals: 3,
  snacking: 'Sometimes',
  highCalorieFoods: false,
  waterIntake: 3,
  monitorsCalories: true,
  sleepHours: 8,
  stressLevel: 2,
  smoker: false,
  alcohol: 'Sometimes',
  screenTime: 0,
  activityFrequency: 3,
  transport: 'Walking',
  familyHistoryOverweight: false,
  familyHistoryDiabetes: false,
  highBloodGlucose: false,
  bloodPressureMedication: false,
  primaryGoal: 'maintain',
  daysPerWeek: 4,
  workoutPlace: 'home',
});

const highRiskAnswers = () => ({
  ...healthyAnswers(),
  gender: 'male',
  age: 58,
  heightCm: 175,
  weightKg: 110,
  waistCm: 115,
  vegetableFrequency: 1,
  mainMeals: 2,
  snacking: 'Always',
  highCalorieFoods: true,
  waterIntake: 1,
  monitorsCalories: false,
  sleepHours: 5,
  stressLevel: 5,
  smoker: true,
  alcohol: 'Always',
  screenTime: 2,
  activityFrequency: 0,
  transport: 'Automobile',
  familyHistoryOverweight: true,
  familyHistoryDiabetes: true,
  highBloodGlucose: true,
  bloodPressureMedication: true,
  primaryGoal: 'lose_weight',
  workoutPlace: 'gym',
});

describe('FE-04 Health assessment', () => {
  describe('questionnaire', () => {
    it('exposes versioned sections with unique question ids', () => {
      const q = getQuestionnaire();
      expect(q.version).to.match(/^\d+\.\d+\.\d+$/);
      expect(q.sections).to.have.length.greaterThan(3);
      const ids = QUESTIONS.map((x) => x.id);
      expect(new Set(ids).size).to.equal(ids.length);
      expect(q.disclaimer).to.match(/not a medical diagnosis/);
    });

    it('maps answers onto every AI model feature', () => {
      const survey = toAiSurvey(healthyAnswers());
      expect(survey).to.include({ Gender: 'female', Age: 30, Height: 1.65, Weight: 60, SMOKE: 'no', MTRANS: 'Walking' });
      expect(Object.keys(survey)).to.have.length(16);
    });

    it('builds a plan survey accepted by /api/medical-report/plan', () => {
      const survey = toPlanSurvey({ ...healthyAnswers(), targetWeightKg: 58 });
      expect(survey).to.deep.equal({
        Gender: 'Female', Age: 30, Height: 1.65, Weight: 60, days_per_week: 4, workout_place: 'home', target_weight: 58,
      });
    });
  });

  describe('validator', () => {
    it('accepts a complete submission and coerces form values', () => {
      const { value, errors } = validateSubmission({
        consent: true,
        answers: { ...healthyAnswers(), age: '30', smoker: 'no', unknownField: 'x' },
      });
      expect(errors).to.equal(undefined);
      expect(value.answers.age).to.equal(30);
      expect(value.answers.smoker).to.equal(false);
      expect(value.answers).to.not.have.property('unknownField');
      expect(value.save).to.equal(true);
    });

    it('requires consent', () => {
      const { errors } = validateSubmission({ answers: healthyAnswers() });
      expect(errors.map((e) => e.field)).to.include('consent');
    });

    it('reports every invalid field at once', () => {
      const { errors } = validateSubmission({
        consent: true,
        answers: { ...healthyAnswers(), age: 7, snacking: 'hourly', heightCm: undefined },
      });
      expect(errors.map((e) => e.field)).to.include.members(['age', 'snacking', 'heightCm']);
    });

    it('rejects an implausible height and weight combination', () => {
      const { errors } = validateSubmission({ consent: true, answers: { ...healthyAnswers(), heightCm: 120, weightKg: 300 } });
      expect(errors[0].field).to.equal('weightKg');
    });

    it('rejects a dangerously low target weight', () => {
      const { errors } = validateSubmission({ consent: true, answers: { ...healthyAnswers(), targetWeightKg: 35 } });
      expect(errors[0].field).to.equal('targetWeightKg');
    });
  });

  describe('scoring engine', () => {
    it('computes BMI, healthy range and waist risk', () => {
      const body = engine.computeBodyMetrics(highRiskAnswers());
      expect(body.bmi).to.equal(35.9);
      expect(body.bmiCategory.key).to.equal('obese_2');
      expect(body.healthyWeightRangeKg).to.deep.equal({ min: 56.7, max: 76.3 });
      expect(body.waist.key).to.equal('high');
    });

    it('uses Mifflin-St Jeor for energy targets', () => {
      const answers = healthyAnswers();
      const targets = engine.computeTargets(answers, engine.computeBodyMetrics(answers));
      // 10*60 + 6.25*165 - 5*30 - 161 = 1320.25
      expect(targets.bmr).to.equal(1320);
      expect(targets.tdee).to.equal(Math.round(1320.25 * 1.725));
      expect(targets.calories).to.equal(2280);
      expect(targets.waterLitres).to.equal(2.1);
    });

    it('applies a deficit for weight loss but never goes below the safety floor', () => {
      const answers = { ...healthyAnswers(), primaryGoal: 'lose_weight', weightKg: 48, heightCm: 150, age: 70, activityFrequency: 0 };
      const targets = engine.computeTargets(answers, engine.computeBodyMetrics(answers));
      expect(targets.calories).to.be.at.least(1200);
    });

    it('scores the AUSDRISK-adapted diabetes risk', () => {
      const answers = highRiskAnswers();
      const risk = engine.computeDiabetesRisk(answers, engine.computeBodyMetrics(answers));
      // 6 age + 3 male + 3 family + 6 glucose + 2 BP + 2 smoking + 1 veg + 2 activity + 7 waist
      expect(risk.score).to.equal(32);
      expect(risk.level.key).to.equal('high');
      expect(risk.waistEstimated).to.equal(false);
    });

    it('estimates waist from BMI when waist is not provided and says so', () => {
      const answers = { ...highRiskAnswers(), waistCm: undefined };
      const risk = engine.computeDiabetesRisk(answers, engine.computeBodyMetrics(answers));
      expect(risk.waistEstimated).to.equal(true);
      expect(risk.factors.some((f) => /used in place of waist/.test(f.label))).to.equal(true);
    });

    it('rates a healthy profile highly with low risk', () => {
      const result = engine.assess(healthyAnswers());
      expect(result.overall.score).to.be.at.least(85);
      expect(result.overall.band.key).to.equal('excellent');
      expect(result.overall.risk.key).to.equal('low');
      expect(result.riskFlags).to.have.length(0);
      expect(result.recommendations[0].id).to.equal('maintain');
    });

    it('rates a high-risk profile low, flags risks and prioritises actions', () => {
      const result = engine.assess(highRiskAnswers());
      expect(result.overall.score).to.be.below(40);
      expect(result.overall.risk.key).to.equal('high');
      expect(result.riskFlags[0].severity).to.equal('high');
      const ids = result.recommendations.map((r) => r.id);
      expect(ids).to.include.members(['see_gp', 'quit_smoking', 'weight', 'move_more']);
      expect(result.recommendations[0].priority).to.equal(1);
      result.domains.forEach((d) => expect(d.score).to.be.within(0, 100));
    });

    it('weights domains to exactly 100%', () => {
      const total = Object.values(engine.DOMAIN_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(Math.round(total * 100)).to.equal(100);
    });

    it('is deterministic', () => {
      expect(engine.assess(highRiskAnswers())).to.deep.equal(engine.assess(highRiskAnswers()));
    });
  });

  describe('AI layer', () => {
    it('normalises model predictions and checks agreement with the rules engine', async () => {
      const answers = highRiskAnswers();
      const result = engine.assess(answers);
      const predictionService = {
        predict: async (survey, options) => {
          expect(survey.Gender).to.equal('male');
          expect(options.fetch).to.be.a('function');
          return {
            body: {
              medical_report: {
                obesity_prediction: { obesity_level: 'Obesity_Type_II', confidence: 0.91 },
                diabetes_prediction: { diabetes: 'true', confidence: 87.5 },
              },
            },
          };
        },
      };
      const model = await ai.getModelPredictions(answers, result, { predictionService, fetch: async () => ({}) });
      expect(model.available).to.equal(true);
      expect(model.obesity).to.deep.include({ level: 'Obesity_Type_II', confidence: 91, agreesWithBmi: true });
      expect(model.diabetes).to.deep.include({ positive: true, confidence: 88, agreesWithScreening: true });
    });

    it('falls back to the rules engine when the model is unreachable', async () => {
      const answers = healthyAnswers();
      const predictionService = { predict: async () => { throw new Error('ECONNREFUSED'); } };
      const model = await ai.getModelPredictions(answers, engine.assess(answers), { predictionService, fetch: async () => ({}) });
      expect(model).to.deep.equal({ available: false, source: 'rules_engine', reason: 'AI model unavailable' });
    });

    it('uses the LLM narrative when a provider answers with JSON', async () => {
      const answers = healthyAnswers();
      const provider = async (message) => {
        expect(message).to.not.include('165'); // no raw height in the prompt
        return { text: '```json\n{"headline":"Great work","summary":"You are doing well.","motivation":"Keep going."}\n```', model: 'stub' };
      };
      const narrative = await ai.getNarrative(engine.assess(answers), answers, { narrativeProviders: [provider] });
      expect(narrative).to.deep.equal({ headline: 'Great work', summary: 'You are doing well.', motivation: 'Keep going.', source: 'llm', model: 'stub' });
    });

    it('falls back to a template narrative when every provider fails', async () => {
      const answers = highRiskAnswers();
      const failing = async () => ({ text: 'not json' });
      const narrative = await ai.getNarrative(engine.assess(answers), answers, { narrativeProviders: [failing] });
      expect(narrative.source).to.equal('template');
      expect(narrative.summary).to.match(/out of 100/);
    });
  });

  describe('service', () => {
    const fakeAi = {
      getModelPredictions: async () => ({ available: false, source: 'rules_engine' }),
      getNarrative: async () => ({ headline: 'h', summary: 's', motivation: 'm', source: 'template' }),
    };

    it('scores, compares with the previous result and persists', async () => {
      const created = [];
      const repository = {
        listForUser: async () => [{ id: 'prev', createdAt: '2026-10-01T00:00:00Z', overallScore: 50 }],
        create: async (userId, assessment) => {
          created.push({ userId, assessment });
          return { id: 'new-id', createdAt: '2026-11-17T00:00:00Z' };
        },
      };
      const service = createHealthAssessmentService({ repository, ai: fakeAi });
      const out = await service.submit(7, { answers: healthyAnswers(), save: true });

      expect(out.id).to.equal('new-id');
      expect(out.persisted).to.equal(true);
      expect(out.comparison.trend).to.equal('improved');
      expect(out.comparison.delta).to.equal(out.result.overall.score - 50);
      expect(out.planRequest.medical_report[0].obesity_prediction.obesity_level).to.equal('Normal_Weight');
      expect(created[0].userId).to.equal(7);
      expect(created[0].assessment.answers.heightCm).to.equal(165);
    });

    it('still returns the result when saving fails', async () => {
      const repository = {
        listForUser: async () => [],
        create: async () => { throw new Error('db down'); },
      };
      const service = createHealthAssessmentService({ repository, ai: fakeAi });
      const out = await service.submit(7, { answers: healthyAnswers(), save: true });
      expect(out.persisted).to.equal(false);
      expect(out.persistError).to.be.a('string');
      expect(out.result.overall.score).to.be.a('number');
    });

    it('does not persist when the user opts out', async () => {
      let called = false;
      const repository = { listForUser: async () => [], create: async () => { called = true; } };
      const service = createHealthAssessmentService({ repository, ai: fakeAi });
      const out = await service.submit(7, { answers: healthyAnswers(), save: false });
      expect(called).to.equal(false);
      expect(out.persisted).to.equal(false);
      expect(out.persistError).to.equal(null);
    });

    it('builds history stats and an oldest-first trend', async () => {
      const repository = {
        listForUser: async (_u, { limit }) => {
          expect(limit).to.equal(50);
          return [
            { id: 'c', createdAt: '2026-11-01', overallScore: 72 },
            { id: 'b', createdAt: '2026-10-01', overallScore: 64 },
            { id: 'a', createdAt: '2026-09-01', overallScore: 58 },
          ];
        },
      };
      const service = createHealthAssessmentService({ repository, ai: fakeAi });
      const out = await service.history(7, { limit: 500 });
      expect(out.trend.map((t) => t.id)).to.deep.equal(['a', 'b', 'c']);
      expect(out.stats).to.deep.equal({ count: 3, latestScore: 72, bestScore: 72, changeSinceFirst: 14 });
    });

    it('raises 404 for assessments the user does not own', async () => {
      const repository = { findForUser: async () => null, deleteForUser: async () => false };
      const service = createHealthAssessmentService({ repository, ai: fakeAi });
      for (const call of [() => service.getById(7, 'x'), () => service.remove(7, 'x')]) {
        try {
          await call();
          expect.fail('should have thrown');
        } catch (error) {
          expect(error.statusCode).to.equal(404);
        }
      }
    });

    it('classifies small score changes as steady', () => {
      expect(buildComparison({ id: 'p', overallScore: 70 }, { overall: { score: 71 } }).trend).to.equal('steady');
      expect(buildComparison(null, { overall: { score: 71 } })).to.equal(null);
    });
  });
});
