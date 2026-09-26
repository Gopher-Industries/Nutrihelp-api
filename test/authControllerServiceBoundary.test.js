const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const { ServiceError } = require('../services/serviceError');

describe('Auth controller service boundaries', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('delegates login requests to loginService and returns its status/body', async () => {
    const loginService = {
      login: sinon.stub().resolves({
        statusCode: 202,
        body: { message: 'An MFA Token has been sent to your email address' }
      })
    };

    const controller = proxyquire('../controller/loginController', {
      '../services/loginService': loginService
    });

    const req = {
      body: { email: 'user@example.com', password: 'Secret123!' },
      headers: { 'x-forwarded-for': '127.0.0.1', 'user-agent': 'mocha' },
      socket: { remoteAddress: '127.0.0.1' },
      get: sinon.stub().returns('mocha')
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.login(req, res);

    expect(loginService.login.calledOnce).to.equal(true);
    expect(loginService.login.firstCall.args[0]).to.deep.include({
      email: 'user@example.com',
      password: 'Secret123!',
      ip: '127.0.0.1',
      userAgent: 'mocha'
    });
    expect(res.status.calledWith(202)).to.equal(true);
    expect(res.json.calledWith({ message: 'An MFA Token has been sent to your email address' })).to.equal(true);
  });

  it('maps warning-style service errors from loginService into stable HTTP payloads', async () => {
    const loginService = {
      login: sinon.stub().rejects(new ServiceError(429, '⚠ You have one attempt left before your account is temporarily locked.', {
        warningOnly: true
      }))
    };

    const controller = proxyquire('../controller/loginController', {
      '../services/loginService': loginService
    });

    const req = {
      body: { email: 'user@example.com', password: 'bad' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      get: sinon.stub().returns('')
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.login(req, res);

    expect(res.status.calledWith(429)).to.equal(true);
    expect(res.json.calledWith({
      warning: '⚠ You have one attempt left before your account is temporarily locked.'
    })).to.equal(true);
  });

  it('delegates signup requests to signupService and preserves service error codes', async () => {
    const signupService = {
      signup: sinon.stub().rejects(new ServiceError(400, 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.', {
        code: 'WEAK_PASSWORD'
      }))
    };

    const controller = proxyquire('../controller/signupController', {
      '../services/signupService': signupService
    });

    const req = {
      body: { name: 'User', email: 'user@example.com', password: 'weak', contact_number: '', address: '' },
      headers: {},
      socket: { remoteAddress: '::1' },
      ip: '::1',
      get: sinon.stub().returns('browser')
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.signup(req, res);

    expect(signupService.signup.calledOnce).to.equal(true);
    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.calledWith({
      code: 'WEAK_PASSWORD',
      error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
    })).to.equal(true);
  });

  it('delegates profile lookups to authService', async () => {
    const userProfileService = {
      '@noCallThru': true,
      getCanonicalProfile: sinon.stub().resolves({
        success: true,
        contractVersion: 'user-profile-v1',
        profile: { id: 1, email: 'user@example.com' },
        preferenceSummary: { allergies: [], hasPreferences: false }
      })
    };

    const controller = proxyquire('../controller/authController', {
      '../services/authService': { '@noCallThru': {} },
      '../services/userProfileService': userProfileService
    });

    const req = {
      user: { userId: 1 }
    };
    const res = {
      json: sinon.stub()
    };

    await controller.getProfile(req, res);

    expect(userProfileService.getCanonicalProfile.calledOnceWith({ userId: 1 })).to.equal(true);
    expect(res.json.calledWith({
      success: true,
      contractVersion: 'user-profile-v1',
      profile: { id: 1, email: 'user@example.com' },
      preferenceSummary: { allergies: [], hasPreferences: false }
    })).to.equal(true);
  });
});
