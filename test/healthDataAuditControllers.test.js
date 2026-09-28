const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const { ServiceError } = require('../services/serviceError');

describe('Health Data Audit Controller Integration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('audits authenticated access to user preferences', async () => {
    const fetchUserPreferences = sinon.stub().resolves({
      dietary_requirements: [],
      allergies: [],
      health_conditions: [],
    });

    const logHealthDataAccess = sinon.stub().resolves(true);

    const controller = proxyquire('../controller/userPreferencesController', {
      '../model/fetchUserPreferences': fetchUserPreferences,
      '../model/updateUserPreferences': sinon.stub(),
      '../services/userPreferencesService': {},
      '../services/healthDataAuditService': { logHealthDataAccess },
      '../utils/logger': { error: sinon.stub() },
    });

    const req = {
      user: { userId: 55 },
      requestId: 'request-preferences',
    };

    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.getUserPreferences(req, res);

    expect(fetchUserPreferences.calledOnceWith(55)).to.equal(true);
    expect(logHealthDataAccess.calledOnce).to.equal(true);
    expect(logHealthDataAccess.firstCall.args[0]).to.include({
      req,
      targetUserId: 55,
      resource: 'USER_PREFERENCES',
    });
    expect(res.status.calledWith(200)).to.equal(true);
  });

  it('audits authenticated access to extended health context', async () => {
    const userPreferencesService = {
      getExtendedPreferences: sinon.stub().resolves({
        success: true,
        data: {
          health_context: {
            allergies: [],
            chronic_conditions: [],
            medications: [],
          },
        },
      }),
    };

    const logHealthDataAccess = sinon.stub().resolves(true);

    const controller = proxyquire('../controller/userPreferencesController', {
      '../model/fetchUserPreferences': sinon.stub(),
      '../model/updateUserPreferences': sinon.stub(),
      '../services/userPreferencesService': userPreferencesService,
      '../services/healthDataAuditService': { logHealthDataAccess },
      '../utils/logger': { error: sinon.stub() },
    });

    const req = {
      user: { userId: 55 },
      requestId: 'request-health-context',
    };

    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.getExtendedUserPreferences(req, res);

    expect(
      userPreferencesService.getExtendedPreferences.calledOnceWith(55)
    ).to.equal(true);

    expect(logHealthDataAccess.calledOnce).to.equal(true);
    expect(logHealthDataAccess.firstCall.args[0]).to.include({
      req,
      targetUserId: 55,
      resource: 'HEALTH_CONTEXT',
    });

    expect(res.status.calledWith(200)).to.equal(true);
  });

  it('audits the resolved target when an admin reads another user profile', async () => {
    const userProfileService = {
      getCanonicalProfile: sinon.stub().resolves({
        success: true,
        contractVersion: 'user-profile-v1',
        profile: {
          id: 9,
          email: 'target@example.com',
        },
        preferenceSummary: {
          allergies: [],
          hasPreferences: false,
        },
      }),
    };

    const logHealthDataAccess = sinon.stub().resolves(true);

    const controller = proxyquire('../controller/userProfileController', {
      '../services': {
        authAndIdentity: {
          userProfileService,
          serviceError: { ServiceError },
        },
      },
      '../services/healthDataAuditService': { logHealthDataAccess },
      '../utils/logger': { error: sinon.stub() },
    });

    const req = {
      user: {
        userId: 1,
        role: 'admin',
        email: 'admin@example.com',
      },
      query: {
        email: 'target@example.com',
      },
      body: {},
      requestId: 'request-admin-profile',
    };

    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.getUserProfile(req, res);

    expect(
      userProfileService.getCanonicalProfile.calledOnceWith({
        email: 'target@example.com',
      })
    ).to.equal(true);

    expect(logHealthDataAccess.calledOnce).to.equal(true);
    expect(logHealthDataAccess.firstCall.args[0]).to.include({
      req,
      targetUserId: 9,
      resource: 'USER_PROFILE',
    });

    expect(res.status.calledWith(200)).to.equal(true);
  });

  it('does not audit when health-data retrieval fails', async () => {
    const fetchUserPreferences = sinon.stub().rejects(
      new ServiceError(500, 'Preference retrieval failed')
    );

    const logHealthDataAccess = sinon.stub().resolves(true);

    const controller = proxyquire('../controller/userPreferencesController', {
      '../model/fetchUserPreferences': fetchUserPreferences,
      '../model/updateUserPreferences': sinon.stub(),
      '../services/userPreferencesService': {},
      '../services/healthDataAuditService': { logHealthDataAccess },
      '../utils/logger': { error: sinon.stub() },
    });

    const req = {
      user: { userId: 55 },
    };

    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.getUserPreferences(req, res);

    expect(logHealthDataAccess.called).to.equal(false);
    expect(res.status.calledWith(500)).to.equal(true);
  });
});
