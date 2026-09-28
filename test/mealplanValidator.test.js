const { expect } = require('chai');

const { validationResult } = require('express-validator');

const {
  getMyMealPlanValidation
} = require('../validators/mealplanValidator');

async function runValidation(query) {
  const req = { query };

  for (const rule of getMyMealPlanValidation) {
    // eslint-disable-next-line no-await-in-loop
    await rule.run(req);
  }

  return validationResult(req).array();
}

describe('Meal Plan /me Validation', () => {
  it('accepts valid start_date and end_date', async () => {
    const errors = await runValidation({
      start_date: '2026-05-01',
      end_date: '2026-05-31'
    });

    expect(errors).to.deep.equal([]);
  });

  it('rejects malformed start_date', async () => {
    const errors = await runValidation({
      start_date: 'not-a-date',
      end_date: '2026-05-31'
    });

    expect(errors.length).to.be.greaterThan(0);
    expect(errors[0].path).to.equal('start_date');
  });

  it('rejects malformed end_date', async () => {
    const errors = await runValidation({
      start_date: '2026-05-01',
      end_date: '31-05-2026'
    });

    expect(errors.length).to.be.greaterThan(0);
    expect(errors[0].path).to.equal('end_date');
  });

  it('allows requests without date filters', async () => {
    const errors = await runValidation({});

    expect(errors).to.deep.equal([]);
  });
});
