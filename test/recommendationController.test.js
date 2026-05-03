const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

describe('Recommendation Controller', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns the service payload to the client', async () => {
    const generateRecommendations = sinon.stub().resolves({
      success: true,
      data: {
        items: [{ rank: 1, recipeId: 10, title: 'Protein Bowl' }]
      },
      recommendations: [{ rank: 1, recipeId: 10, title: 'Protein Bowl' }]
    });

    const controller = proxyquire('../controller/recommendationController', {
      '../services': {
        coreApp: { recommendationService: { generateRecommendations } },
        shared: {
          apiResponse: {
            createErrorResponse(message, code) {
              return { success: false, error: { message, code } };
            }
          }
        }
      }
    });

    const req = {
      user: { userId: 42, email: 'test@example.com' },
      body: { maxResults: 3, healthGoals: { prioritizeProtein: true }, dietaryConstraints: {} }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getRecommendations(req, res);

    expect(generateRecommendations.calledOnce).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
    expect(res.json.calledWith({
      success: true,
      data: {
        items: [{ rank: 1, recipeId: 10, title: 'Protein Bowl' }]
      },
      recommendations: [{ rank: 1, recipeId: 10, title: 'Protein Bowl' }]
    })).to.equal(true);
  });

  it('returns 400 when dietaryConstraints is missing', async () => {
    const generateRecommendations = sinon.stub();
    const controller = proxyquire('../controller/recommendationController', {
      '../services': {
        coreApp: { recommendationService: { generateRecommendations } },
        shared: {
          apiResponse: {
            createErrorResponse(message, code) {
              return { success: false, error: { message, code } };
            }
          }
        }
      }
    });

    const req = {
      user: { userId: 42, email: 'test@example.com' },
      body: {}
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getRecommendations(req, res);

    expect(generateRecommendations.called).to.equal(false);
    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.calledWith({
      success: false,
      error: {
        message: 'dietaryConstraints is required and must be an object',
        code: 'VALIDATION_ERROR'
      }
    })).to.equal(true);
  });

  it('returns 400 when maxResults is malformed', async () => {
    const generateRecommendations = sinon.stub();
    const controller = proxyquire('../controller/recommendationController', {
      '../services': {
        coreApp: { recommendationService: { generateRecommendations } },
        shared: {
          apiResponse: {
            createErrorResponse(message, code) {
              return { success: false, error: { message, code } };
            }
          }
        }
      }
    });

    const req = {
      user: { userId: 42, email: 'test@example.com' },
      body: {
        dietaryConstraints: {},
        maxResults: '3'
      }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getRecommendations(req, res);

    expect(generateRecommendations.called).to.equal(false);
    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.calledWith({
      success: false,
      error: {
        message: 'maxResults must be an integer between 1 and 20',
        code: 'VALIDATION_ERROR'
      }
    })).to.equal(true);
  });

  it('returns 400 when aiInsights is malformed', async () => {
    const generateRecommendations = sinon.stub();
    const controller = proxyquire('../controller/recommendationController', {
      '../services': {
        coreApp: { recommendationService: { generateRecommendations } },
        shared: {
          apiResponse: {
            createErrorResponse(message, code) {
              return { success: false, error: { message, code } };
            }
          }
        }
      }
    });

    const req = {
      user: { userId: 42, email: 'test@example.com' },
      body: {
        dietaryConstraints: {},
        aiInsights: 'invalid'
      }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getRecommendations(req, res);

    expect(generateRecommendations.called).to.equal(false);
    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.calledWith({
      success: false,
      error: {
        message: 'aiInsights must be an object when provided',
        code: 'VALIDATION_ERROR'
      }
    })).to.equal(true);
  });

  it('returns a generic 500 error when the service throws an unexpected internal error', async () => {
    const generateRecommendations = sinon.stub().rejects(new Error('database connection string leaked'));
    const controller = proxyquire('../controller/recommendationController', {
      '../services': {
        coreApp: { recommendationService: { generateRecommendations } },
        shared: {
          apiResponse: {
            createErrorResponse(message, code) {
              return { success: false, error: { message, code } };
            }
          }
        }
      }
    });

    const req = {
      user: { userId: 42, email: 'test@example.com' },
      body: {
        dietaryConstraints: {}
      }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getRecommendations(req, res);

    expect(res.status.calledWith(500)).to.equal(true);
    expect(res.json.calledWith({
      success: false,
      error: {
        message: 'Failed to generate recommendations',
        code: 'RECOMMENDATION_FAILED'
      }
    })).to.equal(true);
  });
});
