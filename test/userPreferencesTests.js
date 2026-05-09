const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const { ServiceError } = require('../services/serviceError');

describe('User Preferences Controller', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns the authenticated user preferences without requiring body.user', async () => {
    const fetchUserPreferences = sinon.stub().resolves({
      dietary_requirements: [{ id: 1, name: 'Vegetarian' }],
      allergies: [{ id: 2, name: 'Peanuts' }],
      cuisines: [],
      dislikes: [],
      health_conditions: [],
      spice_levels: [],
      cooking_methods: [],
      health_context: { allergies: [], chronic_conditions: [], medications: [] },
      notification_preferences: {},
      ui_settings: {}
    });

    const controller = proxyquire('../controller/userPreferencesController', {
      '../model/fetchUserPreferences': fetchUserPreferences,
      '../model/updateUserPreferences': sinon.stub(),
      '../services/userPreferencesService': {},
      '../utils/logger': { error: sinon.stub() }
    });

    const req = { user: { userId: 55 } };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getUserPreferences(req, res);

    expect(fetchUserPreferences.calledOnceWith(55)).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
  });

  it('updates preferences using the authenticated user id', async () => {
    const updateUserPreferences = sinon.stub().resolves();

    const controller = proxyquire('../controller/userPreferencesController', {
      '../model/fetchUserPreferences': sinon.stub(),
      '../model/updateUserPreferences': updateUserPreferences,
      '../services/userPreferencesService': {},
      '../utils/logger': { error: sinon.stub() }
    });

    const req = {
      user: { userId: 55 },
      body: {
        dietary_requirements: [1],
        allergies: [2],
        cuisines: [3],
        dislikes: [4],
        health_conditions: [5],
        spice_levels: [6],
        cooking_methods: [7]
      }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub()
    };

    await controller.postUserPreferences(req, res);

    expect(updateUserPreferences.calledOnceWith(55, req.body)).to.equal(true);
    expect(res.status.calledWith(204)).to.equal(true);
  });

  it('preserves model statusCode errors on POST', async () => {
    const updateUserPreferences = sinon.stub().rejects(
      new ServiceError(400, 'All preference groups are required')
    );

    const controller = proxyquire('../controller/userPreferencesController', {
      '../model/fetchUserPreferences': sinon.stub(),
      '../model/updateUserPreferences': updateUserPreferences,
      '../services/userPreferencesService': {},
      '../utils/logger': { error: sinon.stub() }
    });

    const req = { user: { userId: 55 }, body: {} };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.postUserPreferences(req, res);

    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.calledOnce).to.equal(true);
  });
});
