const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Recommendation Controller', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns the service payload to the client', async () => {
    const generateRecommendations = sinon.stub().resolves({
      success: true,
      recommendations: [{ rank: 1, recipeId: 10, title: 'Protein Bowl' }]
    });

    const controller = proxyquire('../controller/recommendationController', {
      '../services/recommendationService': { generateRecommendations }
    });

    const req = {
      user: { userId: 42, email: 'test@example.com' },
      body: { maxResults: 3, healthGoals: { prioritizeProtein: true } }
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
      recommendations: [{ rank: 1, recipeId: 10, title: 'Protein Bowl' }]
    })).to.equal(true);
  });
});
