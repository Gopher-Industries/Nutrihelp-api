const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('AuthService OAuth exchange', () => {
  const createQueryBuilder = ({ maybeSingleData = null, singleData = null, updateData = null } = {}) => {
    const chain = {
      select: sinon.stub().returnsThis(),
      eq: sinon.stub().returnsThis(),
      maybeSingle: sinon.stub().resolves({ data: maybeSingleData, error: null }),
      single: sinon.stub().resolves({ data: singleData, error: null }),
      insert: sinon.stub().returnsThis(),
      update: sinon.stub().returnsThis(),
    };

    if (updateData !== null) {
      chain.eq = sinon.stub().returns({
        then: undefined,
      });
    }

    return chain;
  };

  afterEach(() => {
    sinon.restore();
  });

  it('exchanges a Supabase access token into a backend session and creates an OAuth user when needed', async () => {
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
    process.env.JWT_TOKEN = process.env.JWT_TOKEN || 'test-jwt-secret';

    const authGetUserStub = sinon.stub().resolves({
      data: {
        user: {
          email: 'oauth@example.com',
          app_metadata: { provider: 'google' },
          user_metadata: {
            full_name: 'OAuth User',
            first_name: 'OAuth',
            last_name: 'User',
          }
        }
      },
      error: null
    });

    const anonFindUserChain = createQueryBuilder({ maybeSingleData: null });
    const anonUpdateChain = {
      update: sinon.stub().returnsThis(),
      eq: sinon.stub().resolves({ error: null }),
    };

    const serviceInsertChain = createQueryBuilder({
      singleData: {
        user_id: 42,
        email: 'oauth@example.com',
        name: 'OAuth User',
        role_id: 7,
        account_status: 'active',
        user_roles: { role_name: 'user' }
      }
    });

    const anonClient = {
      auth: { getUser: authGetUserStub },
      from: sinon.stub()
    };
    anonClient.from.withArgs('users').onFirstCall().returns(anonFindUserChain);
    anonClient.from.withArgs('users').onSecondCall().returns(anonUpdateChain);
    anonClient.from.withArgs('auth_logs').returns({
      insert: sinon.stub().resolves({ error: null })
    });

    const serviceClient = {
      from: sinon.stub()
    };
    serviceClient.from.withArgs('users').returns(serviceInsertChain);

    const createClientStub = sinon.stub();
    createClientStub.onFirstCall().returns(anonClient);
    createClientStub.onSecondCall().returns(serviceClient);

    const logSecurityEvent = sinon.stub().resolves();

    const authService = proxyquire('../services/authService', {
      '@supabase/supabase-js': { createClient: createClientStub },
      './securityEventService': { logSecurityEvent },
      '../Monitor_&_Logging/loginLogger': sinon.stub().resolves(),
      './userProfileService': {},
    });

    sinon.stub(authService, 'generateTokenPair').resolves({
      accessToken: 'backend-access',
      refreshToken: 'backend-refresh',
      expiresIn: 900,
      tokenType: 'Bearer'
    });

    const result = await authService.exchangeSupabaseToken(
      { supabaseAccessToken: 'supabase-token', provider: 'google' },
      { ip: '127.0.0.1', userAgent: 'mocha' }
    );

    expect(authGetUserStub.calledOnceWith('supabase-token')).to.equal(true);
    expect(result.success).to.equal(true);
    expect(result.user.email).to.equal('oauth@example.com');
    expect(result.accessToken).to.equal('backend-access');
    expect(result.session.accessToken).to.equal('backend-access');
    expect(result.ssoSession).to.equal(true);
    expect(result.provider).to.equal('google');
    expect(logSecurityEvent.calledOnce).to.equal(true);
  });
});
