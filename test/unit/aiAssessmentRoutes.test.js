/**
 * FE-06 AI assessment: HTTP contract tests for /api/ai-assessment.
 * Auth and the gateway are stubbed, so these run without a database or model.
 */
const { expect } = require('chai');
const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire').noCallThru();

const { createAiAssessmentController } = require('../../controller/aiAssessmentController');
const { successBodySchema, errorBodySchema } = require('../../services/aiAssessment/schemas');

const validBody = () => JSON.parse(JSON.stringify(require('../../contracts/ai-assessment/v1/fixtures/request-valid.json')));
const fallbackData = require('../../contracts/ai-assessment/v1/fixtures/predict-fallback.json').body.data;

function buildApp(gatewayPredict) {
  const calls = [];
  const gateway = {
    predict: gatewayPredict || (async (inputs, context) => {
      calls.push({ inputs, context });
      return fallbackData;
    }),
  };
  const controller = createAiAssessmentController({ gateway });
  const router = proxyquire('../../routes/aiAssessment', {
    '../middleware/authenticateToken': {
      authenticateToken: (req, res, next) => {
        if (req.headers.authorization !== 'Bearer good') {
          return res.status(401).json({ success: false, error: 'Authorization header missing', code: 'TOKEN_MISSING' });
        }
        req.user = { userId: 42, role: 'user' };
        return next();
      },
    },
    '../controller/aiAssessmentController': { createAiAssessmentController: () => controller },
  });
  const app = express();
  app.use(express.json());
  app.use('/api/ai-assessment', router);
  return { app, calls };
}

const post = (app, body, token = 'good') =>
  request(app).post('/api/ai-assessment/predict').set('Authorization', `Bearer ${token}`).send(body);

describe('FE-06 /api/ai-assessment routes', () => {
  it('publishes the contract without authentication', async () => {
    const res = await request(buildApp().app).get('/api/ai-assessment/contract');
    expect(res.status).to.equal(200);
    expect(res.body.meta.contractVersion).to.equal('v1');
    expect(res.body.data.supportedVersions).to.deep.equal(['v1']);
    expect(res.body.data.inputFields.find((f) => f.id === 'ageYears')).to.include({ min: 16, max: 100 });
    expect(res.body.data.thresholds.diabetesRisk).to.deep.equal({ moderate: 0.3, high: 0.6 });
  });

  it('requires a signed-in user to predict', async () => {
    const res = await request(buildApp().app).post('/api/ai-assessment/predict').send(validBody());
    expect(res.status).to.equal(401);
    expect(errorBodySchema.validate(res.body).error).to.equal(undefined);
  });

  it('returns a contract-shaped prediction for the signed-in user only', async () => {
    const { app, calls } = buildApp();
    const res = await post(app, { ...validBody(), userId: 999 });
    expect(res.status).to.equal(400); // unknown top-level field is rejected
    const ok = await post(app, validBody());
    expect(ok.status).to.equal(200);
    const { error } = successBodySchema.validate(ok.body, { abortEarly: false });
    expect(error, error && error.message).to.equal(undefined);
    expect(calls[0].context).to.deep.equal({ userId: 42 });
  });

  it('rejects wrong types instead of coercing them', async () => {
    const body = validBody();
    body.inputs.ageYears = '45';
    const res = await post(buildApp().app, body);
    expect(res.status).to.equal(400);
    expect(res.body.code).to.equal('VALIDATION_ERROR');
    expect(res.body.errors[0].field).to.equal('ageYears');
  });

  it('lists every invalid and unknown field at once', async () => {
    const body = validBody();
    body.inputs.transport = 'teleport';
    body.inputs.heightCm = 20;
    body.inputs.bloodType = 'O+';
    delete body.inputs.sex;
    const res = await post(buildApp().app, body);
    expect(res.body.errors.map((e) => e.field)).to.include.members(['transport', 'heightCm', 'bloodType', 'sex']);
  });

  it('refuses an unsupported contract version from the body or the header', async () => {
    const { app } = buildApp();
    const fromBody = await post(app, { ...validBody(), contractVersion: 'v2' });
    expect(fromBody.status).to.equal(400);
    expect(fromBody.body.code).to.equal('CONTRACT_VERSION_UNSUPPORTED');
    const body = validBody();
    delete body.contractVersion;
    const fromHeader = await request(app)
      .post('/api/ai-assessment/predict')
      .set('Authorization', 'Bearer good')
      .set('X-Contract-Version', 'v0')
      .send(body);
    expect(fromHeader.body.code).to.equal('CONTRACT_VERSION_UNSUPPORTED');
  });

  it('accepts a request with no version, treating it as v1', async () => {
    const body = validBody();
    delete body.contractVersion;
    expect((await post(buildApp().app, body)).status).to.equal(200);
  });

  it('hides internal error details', async () => {
    const { app } = buildApp(async () => { throw new Error('relation "secret_table" does not exist'); });
    const res = await post(app, validBody());
    expect(res.status).to.equal(500);
    expect(res.body.code).to.equal('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).to.not.include('secret_table');
  });
});
