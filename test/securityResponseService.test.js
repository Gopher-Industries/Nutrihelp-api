const { expect } = require('chai');
const sinon = require('sinon');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
process.env.JWT_TOKEN = process.env.JWT_TOKEN || 'test-jwt-secret';

const authService = require('../services/authService');
const securityResponseService = require('../services/securityEvents/securityResponseService');

describe('securityResponseService', () => {
  let logoutAllStub;

  beforeEach(() => {
    securityResponseService.__resetForTests();
    logoutAllStub = sinon.stub(authService, 'logoutAll').resolves({ success: true });
  });

  afterEach(() => {
    sinon.restore();
    securityResponseService.__resetForTests();
  });

  it('temporarily blocks an IP after repeated auth failures', async () => {
    const req = {
      path: '/api/system/integrity-check',
      headers: {
        'x-forwarded-for': '203.0.113.1',
        'user-agent': 'mocha-test',
      },
    };

    for (let i = 0; i < 8; i += 1) {
      await securityResponseService.registerAuthFailure(req, {
        reason: 'TOKEN_INVALID',
      });
    }

    const block = securityResponseService.getActiveBlock(req);
    expect(block).to.not.equal(null);
    expect(block.eventType).to.equal('auth_failure');
    expect(logoutAllStub.called).to.equal(false);
  });

  it('revokes active sessions after repeated RBAC violations for the same user', async () => {
    const req = {
      originalUrl: '/api/security/events/export',
      method: 'GET',
      headers: {
        'x-forwarded-for': '203.0.113.9',
        'user-agent': 'mocha-test',
      },
      user: {
        userId: 'user-123',
      },
    };

    for (let i = 0; i < 5; i += 1) {
      await securityResponseService.registerRbacViolation(req, {
        status: 'ACCESS_DENIED',
      });
    }

    expect(logoutAllStub.calledOnce).to.equal(true);
    expect(logoutAllStub.firstCall.args[0]).to.equal('user-123');
    expect(securityResponseService.getActiveBlock(req)?.eventType).to.equal('rbac_violation');
  });
});
