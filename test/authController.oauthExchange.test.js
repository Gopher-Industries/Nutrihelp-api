const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('AuthController Google exchange', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('delegates Google exchange to authService and returns the backend session payload', async () => {
    const authService = {
      exchangeSupabaseToken: sinon.stub().resolves({
        success: true,
        user: { id: 1, email: 'oauth@example.com', role: 'user' },
        accessToken: 'backend-access',
        refreshToken: 'backend-refresh',
        expiresIn: 900,
        tokenType: 'Bearer',
        session: {
          accessToken: 'backend-access',
          refreshToken: 'backend-refresh',
          expiresIn: 900,
          tokenType: 'Bearer'
        },
        ssoSession: true,
        provider: 'google'
      }),
      trustedDeviceCookieName: 'trusted_device'
    };

    const controller = proxyquire('../controller/authController', {
      '../services/authService': authService,
      '../services/userProfileService': {},
      '../utils/logger': { error: sinon.stub() }
    });

    const req = {
      body: {
        supabaseAccessToken: 'supabase-token',
        provider: 'google'
      },
      ip: '127.0.0.1',
      get: sinon.stub()
    };
    req.get.withArgs('User-Agent').returns('mocha');
    req.get.withArgs('X-Device-Id').returns('device-1');
    req.get.withArgs('X-Client-Type').returns('mobile');

    const res = {
      json: sinon.stub()
    };

    await controller.googleExchange(req, res);

    expect(authService.exchangeSupabaseToken.calledOnce).to.equal(true);
    expect(authService.exchangeSupabaseToken.firstCall.args[0]).to.deep.equal({
      supabaseAccessToken: 'supabase-token',
      provider: 'google'
    });
    expect(authService.exchangeSupabaseToken.firstCall.args[1]).to.deep.equal({
      ip: '127.0.0.1',
      userAgent: 'mocha',
      deviceId: 'device-1',
      clientType: 'mobile'
    });
    expect(res.json.calledOnce).to.equal(true);
    expect(res.json.firstCall.args[0].session.accessToken).to.equal('backend-access');
  });
});
