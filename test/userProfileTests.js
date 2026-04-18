const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const { ServiceError } = require('../services/serviceError');

describe('User Profile Controller', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns the canonical profile contract for the authenticated user', async () => {
    const userProfileService = {
      getCanonicalProfile: sinon.stub().resolves({
        success: true,
        contractVersion: 'user-profile-v1',
        profile: {
          id: 42,
          email: 'user@example.com',
          firstName: 'Alex'
        },
        preferenceSummary: {
          dietaryRequirements: ['high protein'],
          allergies: [],
          hasPreferences: true
        }
      })
    };

    const controller = proxyquire('../controller/userProfileController', {
      '../services/userProfileService': userProfileService,
      '../utils/logger': { error: sinon.stub() }
    });

    const req = {
      user: { userId: 42, role: 'user', email: 'user@example.com' },
      query: {},
      body: {}
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getUserProfile(req, res);

    expect(userProfileService.getCanonicalProfile.calledOnceWith({ userId: 42 })).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
    expect(res.json.firstCall.args[0]).to.deep.equal({
      success: true,
      contractVersion: 'user-profile-v1',
      profile: {
        id: 42,
        email: 'user@example.com',
        firstName: 'Alex'
      },
      preferenceSummary: {
        dietaryRequirements: ['high protein'],
        allergies: [],
        hasPreferences: true
      }
    });
  });

  it('allows admins to target another user by email on read', async () => {
    const userProfileService = {
      getCanonicalProfile: sinon.stub().resolves({
        success: true,
        contractVersion: 'user-profile-v1',
        profile: { id: 9, email: 'target@example.com' },
        preferenceSummary: { allergies: [], hasPreferences: false }
      })
    };

    const controller = proxyquire('../controller/userProfileController', {
      '../services/userProfileService': userProfileService,
      '../utils/logger': { error: sinon.stub() }
    });

    const req = {
      user: { userId: 1, role: 'admin', email: 'admin@example.com' },
      query: { email: 'target@example.com' },
      body: {}
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getUserProfile(req, res);

    expect(userProfileService.getCanonicalProfile.calledOnceWith({ email: 'target@example.com' })).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
  });

  it('maps canonical update payloads through the shared service', async () => {
    const userProfileService = {
      updateCanonicalProfile: sinon.stub().resolves({
        success: true,
        contractVersion: 'user-profile-v1',
        profile: { id: 42, firstName: 'Updated' },
        preferenceSummary: { allergies: [], hasPreferences: false },
        meta: { updatedBy: 42 }
      })
    };

    const controller = proxyquire('../controller/userProfileController', {
      '../services/userProfileService': userProfileService,
      '../utils/logger': { error: sinon.stub() }
    });

    const req = {
      user: { userId: 42, role: 'user', email: 'user@example.com' },
      query: {},
      body: {
        profile: {
          firstName: 'Updated',
          contactNumber: '12345678'
        }
      }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.updateUserProfile(req, res);

    expect(userProfileService.updateCanonicalProfile.calledOnce).to.equal(true);
    expect(userProfileService.updateCanonicalProfile.firstCall.args[0]).to.deep.equal({
      actor: { userId: 42, role: 'user', email: 'user@example.com' },
      targetLookup: { userId: 42 },
      body: {
        profile: {
          firstName: 'Updated',
          contactNumber: '12345678'
        }
      }
    });
    expect(res.status.calledWith(200)).to.equal(true);
  });

  it('returns stable service errors for invalid updates', async () => {
    const logger = { error: sinon.stub() };
    const userProfileService = {
      updateCanonicalProfile: sinon.stub().rejects(new ServiceError(400, 'At least one profile field is required'))
    };

    const controller = proxyquire('../controller/userProfileController', {
      '../services/userProfileService': userProfileService,
      '../utils/logger': logger
    });

    const req = {
      user: { userId: 42, role: 'user', email: 'user@example.com' },
      query: {},
      body: {}
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.updateUserProfile(req, res);

    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.calledWith({
      success: false,
      error: 'At least one profile field is required'
    })).to.equal(true);
    expect(logger.error.called).to.equal(false);
  });
});
