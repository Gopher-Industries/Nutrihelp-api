/**
 * FE-04 AI Health Assessment: HTTP contract tests for /api/health-assessment.
 * Auth and the service are stubbed, so these run without a database.
 */
const { expect } = require('chai');
const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire').noCallThru();

const { createHealthAssessmentController } = require('../../controller/healthAssessmentController');
const { getQuestionnaire } = require('../../services/healthAssessment/questionnaire');

const VALID_ID = '3f2b8c1e-6a4d-4b7e-9c2a-1d5e8f0a7b3c';

const answers = {
  gender: 'female', age: 30, heightCm: 165, weightKg: 60, vegetableFrequency: 3, mainMeals: 3,
  snacking: 'Sometimes', highCalorieFoods: false, waterIntake: 3, monitorsCalories: true, sleepHours: 8,
  stressLevel: 2, smoker: false, alcohol: 'Sometimes', screenTime: 0, activityFrequency: 3,
  transport: 'Walking', familyHistoryOverweight: false, familyHistoryDiabetes: false,
  highBloodGlucose: false, bloodPressureMedication: false, primaryGoal: 'maintain', daysPerWeek: 4,
  workoutPlace: 'home',
};

function buildApp(serviceOverrides = {}, planGenerator) {
  const calls = [];
  const service = {
    getQuestionnaire,
    submit: async (userId, value) => {
      calls.push(['submit', userId, value]);
      return { id: VALID_ID, persisted: value.save, result: { overall: { score: 90 } } };
    },
    history: async (userId) => ({ items: [], trend: [], stats: { count: 0 }, userId }),
    getLatest: async () => null,
    getById: async (userId, id) => {
      if (id !== VALID_ID) {
        const { ServiceError } = require('../../services/serviceError');
        throw new ServiceError(404, 'Assessment not found');
      }
      return { id, planRequest: { medical_report: [{}], survey_data: { days_per_week: 3 } } };
    },
    remove: async (userId, id) => ({ id, deleted: true }),
    ...serviceOverrides,
  };

  const controller = createHealthAssessmentController({ service, planGenerator });

  const router = proxyquire('../../routes/healthAssessment', {
    '../middleware/authenticateToken': {
      authenticateToken: (req, res, next) => {
        if (req.headers.authorization !== 'Bearer good') {
          return res.status(401).json({ success: false, error: 'Authorization header missing', code: 'TOKEN_MISSING' });
        }
        req.user = { userId: 42, role: 'user' };
        return next();
      },
    },
    '../controller/healthAssessmentController': {
      createHealthAssessmentController: () => controller,
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/health-assessment', router);
  return { app, calls };
}

describe('FE-04 /api/health-assessment routes', () => {
  it('serves the questionnaire without authentication', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/api/health-assessment/questions');
    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.data.sections[0].questions[0].id).to.equal('gender');
    expect(res.headers['cache-control']).to.include('max-age');
  });

  it('requires authentication for every other endpoint', async () => {
    const { app } = buildApp();
    for (const [method, path] of [
      ['post', '/api/health-assessment'],
      ['get', '/api/health-assessment/history'],
      ['get', '/api/health-assessment/latest'],
      ['get', `/api/health-assessment/${VALID_ID}`],
      ['delete', `/api/health-assessment/${VALID_ID}`],
      ['post', `/api/health-assessment/${VALID_ID}/plan`],
    ]) {
      const res = await request(app)[method](path);
      expect(res.status, `${method} ${path}`).to.equal(401);
    }
  });

  it('returns field-level validation errors', async () => {
    const { app, calls } = buildApp();
    const res = await request(app)
      .post('/api/health-assessment')
      .set('Authorization', 'Bearer good')
      .send({ consent: true, answers: { ...answers, age: 3 } });
    expect(res.status).to.equal(400);
    expect(res.body).to.include({ success: false, code: 'HEALTH_ASSESSMENT_VALIDATION' });
    expect(res.body.details[0].field).to.equal('age');
    expect(calls).to.have.length(0);
  });

  it('submits for the authenticated user only, ignoring any user id in the body', async () => {
    const { app, calls } = buildApp();
    const res = await request(app)
      .post('/api/health-assessment')
      .set('Authorization', 'Bearer good')
      .send({ consent: true, answers, user_id: 999 });
    expect(res.status).to.equal(201);
    expect(res.body.success).to.equal(true);
    expect(calls[0][1]).to.equal(42);
  });

  it('responds 200 rather than 201 when the result was not saved', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/health-assessment')
      .set('Authorization', 'Bearer good')
      .send({ consent: true, save: false, answers });
    expect(res.status).to.equal(200);
  });

  it('rejects malformed ids before touching the service', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/api/health-assessment/not-a-uuid').set('Authorization', 'Bearer good');
    expect(res.status).to.equal(400);
    expect(res.body.code).to.equal('HEALTH_ASSESSMENT_INVALID_ID');
  });

  it('returns 404 for an assessment the user does not own', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get('/api/health-assessment/11111111-1111-4111-8111-111111111111')
      .set('Authorization', 'Bearer good');
    expect(res.status).to.equal(404);
    expect(res.body.code).to.equal('HEALTH_ASSESSMENT_NOT_FOUND');
  });

  it('hides internal error details', async () => {
    const { app } = buildApp({ history: async () => { throw new Error('relation does not exist'); } });
    const res = await request(app).get('/api/health-assessment/history').set('Authorization', 'Bearer good');
    expect(res.status).to.equal(500);
    expect(JSON.stringify(res.body)).to.not.include('relation');
  });

  it('generates a plan from a saved assessment and wraps it in the envelope', async () => {
    let received;
    const planGenerator = async (req, res) => {
      received = req.body;
      res.status(200).json({ weekly_plan: [{ week: 1 }], suggestion: 'ok' });
    };
    const { app } = buildApp({}, planGenerator);
    const res = await request(app).post(`/api/health-assessment/${VALID_ID}/plan`).set('Authorization', 'Bearer good');
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ success: true, data: { weekly_plan: [{ week: 1 }], suggestion: 'ok' } });
    expect(received.survey_data.days_per_week).to.equal(3);
  });

  it('deletes an assessment', async () => {
    const { app } = buildApp();
    const res = await request(app).delete(`/api/health-assessment/${VALID_ID}`).set('Authorization', 'Bearer good');
    expect(res.status).to.equal(200);
    expect(res.body.data).to.deep.equal({ id: VALID_ID, deleted: true });
  });
});
