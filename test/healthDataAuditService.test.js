const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Health Data Audit Service', () => {
  afterEach(() => {
    sinon.restore();
  });

  function loadService({ result = { id: 'event-1' }, error = null } = {}) {
    const logSecurityEvent = sinon.stub();

    if (error) {
      logSecurityEvent.rejects(error);
    } else {
      logSecurityEvent.resolves(result);
    }

    const logger = {
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    const service = proxyquire('../services/healthDataAuditService', {
      './securityEventService': {
        logSecurityEvent,
      },
      '../utils/logger': logger,
    });

    return {
      service,
      logSecurityEvent,
      logger,
    };
  }

  it('persists privacy-safe health-data access metadata', async () => {
    const { service, logSecurityEvent } = loadService();

    const req = {
      user: { userId: 12 },
      requestId: 'request-123',
      originalUrl: '/api/user/preferences/extended?example=sensitive',
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        'user-agent': 'NutriHelp-Test',
      },
      ip: '127.0.0.1',
    };

    const result = await service.logHealthDataAccess({
      req,
      targetUserId: 34,
      resource: 'HEALTH_CONTEXT',
    });

    expect(result).to.equal(true);
    expect(logSecurityEvent.calledOnce).to.equal(true);

    expect(logSecurityEvent.firstCall.args[0]).to.deep.equal({
      event_type: 'HEALTH_DATA_ACCESS',
      severity: 'low',
      user_id: 12,
      ip_address: '203.0.113.10',
      user_agent: 'NutriHelp-Test',
      resource: '/api/user/preferences/extended',
      metadata: {
        action: 'READ',
        resource_category: 'HEALTH_CONTEXT',
        target_user_id: 34,
        request_id: 'request-123',
      },
    });
  });

  it('does not insert when required audit metadata is missing', async () => {
    const { service, logSecurityEvent, logger } = loadService();

    const result = await service.logHealthDataAccess({
      req: {
        user: { userId: 12 },
        headers: {},
      },
      targetUserId: null,
      resource: 'HEALTH_CONTEXT',
    });

    expect(result).to.equal(false);
    expect(logSecurityEvent.called).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('returns false when security-event persistence returns no record', async () => {
    const { service, logSecurityEvent, logger } = loadService({
      result: null,
    });

    const result = await service.logHealthDataAccess({
      req: {
        user: { userId: 12 },
        requestId: 'request-456',
        originalUrl: '/api/userprofile',
        headers: {},
      },
      targetUserId: 12,
      resource: 'USER_PROFILE',
    });

    expect(result).to.equal(false);
    expect(logSecurityEvent.calledOnce).to.equal(true);
    expect(logger.error.calledOnce).to.equal(true);
  });

  it('returns false rather than throwing when security-event persistence fails', async () => {
    const { service, logger } = loadService({
      error: new Error('Database unavailable'),
    });

    const result = await service.logHealthDataAccess({
      req: {
        user: { userId: 12 },
        requestId: 'request-789',
        originalUrl: '/api/user/preferences',
        headers: {},
      },
      targetUserId: 12,
      resource: 'USER_PREFERENCES',
    });

    expect(result).to.equal(false);
    expect(logger.error.calledOnce).to.equal(true);
  });
});
