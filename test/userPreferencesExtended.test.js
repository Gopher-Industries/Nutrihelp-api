/**
 * Integration tests for extended user preference endpoints.
 *
 * Covers:
 *   GET  /api/user/preferences/extended
 *   PUT  /api/user/preferences/extended        (health_context, ui_settings)
 *   GET  /api/user/preferences/extended/notifications
 *   PUT  /api/user/preferences/extended/notifications
 *
 * Valid and invalid payload variants are tested for each.
 */
require('dotenv').config();
const chai = require('chai');
const chaiHttp = require('chai-http');
const { addTestUser, deleteTestUser } = require('./test-helpers');

const { expect } = chai;
chai.use(chaiHttp);

const BASE = 'http://localhost:80';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getToken(testUser) {
  const res = await chai
    .request(BASE)
    .post('/api/login')
    .send({ email: testUser.email, password: 'testuser123' });
  return res.body.token;
}

const VALID_HEALTH_CONTEXT = {
  allergies: [
    { referenceId: null, name: 'Peanuts', severity: 'severe', notes: 'Carries EpiPen' },
    { referenceId: 1, name: 'Shellfish', severity: 'moderate', notes: null },
  ],
  chronic_conditions: [
    { referenceId: null, name: 'Type 2 Diabetes', status: 'managed', notes: 'On metformin' },
  ],
  medications: [
    {
      name: 'Metformin',
      dosage: { amount: '500', unit: 'mg' },
      frequency: { timesPerDay: 2, interval: null, schedule: ['morning', 'evening'], asNeeded: false },
      purpose: 'Blood sugar control',
      notes: null,
      active: true,
    },
  ],
};

const VALID_NOTIFICATION_PREFS = {
  mealReminders: false,
  waterReminders: true,
  healthTips: false,
  weeklyReports: true,
  systemUpdates: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/user/preferences/extended', () => {
  let testUser, token;

  before(async function () {
    testUser = await addTestUser();
    token = await getToken(testUser);
  });

  after(async function () {
    await deleteTestUser(testUser.user_id);
  });

  it('returns 401 without auth token', (done) => {
    chai
      .request(BASE)
      .get('/api/user/preferences/extended')
      .end((err, res) => {
        expect(res).to.have.status(401);
        done();
      });
  });

  it('returns 200 with contractVersion and data sections for authenticated user', (done) => {
    chai
      .request(BASE)
      .get('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('contractVersion');
        expect(res.body).to.have.property('data').that.is.an('object');

        const { data } = res.body;
        expect(data).to.have.property('health_context').that.is.an('object');
        expect(data).to.have.property('food_preferences').that.is.an('object');
        expect(data).to.have.property('notification_preferences').that.is.an('object');
        expect(data).to.have.property('ui_settings').that.is.an('object');

        const hc = data.health_context;
        expect(hc).to.have.property('allergies').that.is.an('array');
        expect(hc).to.have.property('chronic_conditions').that.is.an('array');
        expect(hc).to.have.property('medications').that.is.an('array');
        expect(hc).to.have.property('normalized_summary').that.is.an('object');
        done();
      });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/user/preferences/extended — valid payloads', () => {
  let testUser, token;

  before(async function () {
    testUser = await addTestUser();
    token = await getToken(testUser);
  });

  after(async function () {
    await deleteTestUser(testUser.user_id);
  });

  it('returns 200 and persists health_context with allergies, conditions, medications', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({ health_context: VALID_HEALTH_CONTEXT })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('success', true);

        const hc = res.body.data.health_context;
        const allergyNames = hc.normalized_summary.allergyNames;
        expect(allergyNames).to.include('peanuts');
        expect(allergyNames).to.include('shellfish');

        const condNames = hc.normalized_summary.chronicConditionNames;
        expect(condNames).to.include('type 2 diabetes');

        const medNames = hc.normalized_summary.activeMedicationNames;
        expect(medNames).to.include('metformin');
        done();
      });
  });

  it('returns 200 with empty health_context arrays (clearing all health data)', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({
        health_context: { allergies: [], chronic_conditions: [], medications: [] },
      })
      .end((err, res) => {
        expect(res).to.have.status(200);
        const hc = res.body.data.health_context;
        expect(hc.allergies).to.deep.equal([]);
        expect(hc.chronic_conditions).to.deep.equal([]);
        expect(hc.medications).to.deep.equal([]);
        done();
      });
  });

  it('returns 200 when updating ui_settings alongside health_context', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({
        health_context: { allergies: [], chronic_conditions: [], medications: [] },
        ui_settings: { theme: 'dark', language: 'en', font_size: '18px' },
      })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.data.ui_settings.theme).to.equal('dark');
        expect(res.body.data.ui_settings.font_size).to.equal('18px');
        done();
      });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/user/preferences/extended — invalid payloads', () => {
  let testUser, token;

  before(async function () {
    testUser = await addTestUser();
    token = await getToken(testUser);
  });

  after(async function () {
    await deleteTestUser(testUser.user_id);
  });

  it('returns 400 when allergy severity is invalid', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({
        health_context: {
          allergies: [{ name: 'Nuts', severity: 'very-bad' }],
          chronic_conditions: [],
          medications: [],
        },
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });

  it('returns 400 when condition status is invalid', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({
        health_context: {
          allergies: [],
          chronic_conditions: [{ name: 'Asthma', status: 'cured' }],
          medications: [],
        },
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });

  it('returns 400 when medication name is empty', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({
        health_context: {
          allergies: [],
          chronic_conditions: [],
          medications: [{ name: '', dosage: { amount: '10', unit: 'mg' } }],
        },
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });

  it('returns 400 when frequency.timesPerDay is out of range', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({
        health_context: {
          allergies: [],
          chronic_conditions: [],
          medications: [
            {
              name: 'Aspirin',
              frequency: { timesPerDay: 99 },
            },
          ],
        },
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });

  it('returns 400 when ui_settings.theme is invalid', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ui_settings: { theme: 'solarized' },
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });

  it('returns 400 when ui_settings.font_size has bad format', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ui_settings: { font_size: 'large' },
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });

  it('returns 400 when allergies field is not an array', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended')
      .set('Authorization', `Bearer ${token}`)
      .send({
        health_context: { allergies: 'peanuts', chronic_conditions: [], medications: [] },
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/user/preferences/extended/notifications', () => {
  let testUser, token;

  before(async function () {
    testUser = await addTestUser();
    token = await getToken(testUser);
  });

  after(async function () {
    await deleteTestUser(testUser.user_id);
  });

  it('returns 200 with all expected notification keys', (done) => {
    chai
      .request(BASE)
      .get('/api/user/preferences/extended/notifications')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('success', true);
        const prefs = res.body.data;
        ['mealReminders', 'waterReminders', 'healthTips', 'weeklyReports', 'systemUpdates'].forEach(
          (key) => expect(prefs).to.have.property(key)
        );
        done();
      });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/user/preferences/extended/notifications', () => {
  let testUser, token;

  before(async function () {
    testUser = await addTestUser();
    token = await getToken(testUser);
  });

  after(async function () {
    await deleteTestUser(testUser.user_id);
  });

  it('returns 200 and reflects updated notification preferences', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ notification_preferences: VALID_NOTIFICATION_PREFS })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('success', true);
        const prefs = res.body.data;
        expect(prefs.mealReminders).to.equal(false);
        expect(prefs.weeklyReports).to.equal(true);
        done();
      });
  });

  it('returns 400 when notification_preferences is missing', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });

  it('returns 400 when a notification flag is not boolean', (done) => {
    chai
      .request(BASE)
      .put('/api/user/preferences/extended/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ notification_preferences: { mealReminders: 'yes' } })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });
});
