const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Auth Profile Controller', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns the shared canonical profile contract', async () => {
    const userProfileService = {
      getCanonicalProfile: sinon.stub().resolves({
        success: true,
        contractVersion: 'user-profile-v1',
        profile: { id: 3, email: 'user@example.com' },
        preferenceSummary: { allergies: [], hasPreferences: false }
      })
    };

    const controller = proxyquire('../controller/authController', {
      '../services/authService': { '@noCallThru': {} },
      '../services/userProfileService': userProfileService,
      '../utils/logger': { error: sinon.stub() }
    });

    const req = {
      user: { userId: 3 }
    };
    const res = {
      json: sinon.stub()
    };

    await controller.getProfile(req, res);

    expect(userProfileService.getCanonicalProfile.calledOnceWith({ userId: 3 })).to.equal(true);
    expect(res.json.calledWith({
      success: true,
      contractVersion: 'user-profile-v1',
      profile: { id: 3, email: 'user@example.com' },
      preferenceSummary: { allergies: [], hasPreferences: false }
    })).to.equal(true);
  });
});
