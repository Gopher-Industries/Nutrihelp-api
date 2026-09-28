const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Meal Plan model security', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('scopes authenticated meal-plan queries by user ID and date range', async () => {
    const result = {
      data: [
        {
          id: 1,
          meal_type: 'breakfast',
          created_at: '2026-05-10T08:00:00.000Z',
          recipes: []
        }
      ],
      error: null
    };

    const query = {
      select: sinon.stub().returnsThis(),
      eq: sinon.stub().returnsThis(),
      gte: sinon.stub().returnsThis(),
      lte: sinon.stub().returnsThis(),
      then(resolve, reject) {
        return Promise.resolve(result).then(resolve, reject);
      }
    };

    const from = sinon.stub().returns(query);

    const { getForAuthenticatedUser } = proxyquire('../../model/mealPlan.js', {
      '../dbConnection.js': {
        from
      }
    });

    const plans = await getForAuthenticatedUser(101, {
      startDate: '2026-05-01',
      endDate: '2026-05-31'
    });

    expect(from.calledOnceWith('meal_plan')).to.equal(true);

    expect(
      query.select.calledOnceWith('id,meal_type,created_at,recipes')
    ).to.equal(true);

    expect(
      query.eq.calledOnceWith('user_id', 101)
    ).to.equal(true);

    expect(
      query.gte.calledOnceWith(
        'created_at',
        '2026-05-01T00:00:00.000Z'
      )
    ).to.equal(true);

    expect(
      query.lte.calledOnceWith(
        'created_at',
        '2026-05-31T23:59:59.999Z'
      )
    ).to.equal(true);

    expect(plans).to.have.length(1);
    expect(plans[0].id).to.equal(1);
  });

  it('does not apply date filters when they are not supplied', async () => {
    const result = {
      data: [],
      error: null
    };

    const query = {
      select: sinon.stub().returnsThis(),
      eq: sinon.stub().returnsThis(),
      gte: sinon.stub().returnsThis(),
      lte: sinon.stub().returnsThis(),
      then(resolve, reject) {
        return Promise.resolve(result).then(resolve, reject);
      }
    };

    const from = sinon.stub().returns(query);

    const { getForAuthenticatedUser } = proxyquire('../../model/mealPlan.js', {
      '../dbConnection.js': {
        from
      }
    });

    const plans = await getForAuthenticatedUser(202);

    expect(
      query.eq.calledOnceWith('user_id', 202)
    ).to.equal(true);

    expect(query.gte.called).to.equal(false);
    expect(query.lte.called).to.equal(false);
    expect(plans).to.deep.equal([]);
  });
});
