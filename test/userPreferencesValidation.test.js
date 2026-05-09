const { expect } = require('chai');
const { validationResult } = require('express-validator');

const { validateUserPreferences } = require('../validators/userPreferencesValidator');

async function runValidation(body) {
  const req = { body };

  for (const rule of validateUserPreferences) {
    // eslint-disable-next-line no-await-in-loop
    await rule.run(req);
  }

  return validationResult(req).array();
}

describe('User Preferences Validation', () => {
  it('rejects payloads with missing required preference groups', async () => {
    const errors = await runValidation({
      dietary_requirements: [1],
      allergies: [2]
    });

    expect(errors.length).to.be.greaterThan(0);
  });

  it('accepts all seven preference groups as integer arrays', async () => {
    const errors = await runValidation({
      dietary_requirements: [1, 2],
      allergies: [3],
      cuisines: [4],
      dislikes: [5],
      health_conditions: [6],
      spice_levels: [7],
      cooking_methods: [8]
    });

    expect(errors).to.deep.equal([]);
  });
});
