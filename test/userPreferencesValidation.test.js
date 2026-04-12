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
  it('rejects malformed medication dosage/frequency payloads', async () => {
    const errors = await runValidation({
      health_context: {
        medications: [{
          name: 'Metformin',
          dosage: '500mg twice daily'
        }]
      }
    });

    expect(errors.length).to.be.greaterThan(0);
  });

  it('accepts structured health context records', async () => {
    const errors = await runValidation({
      health_context: {
        allergies: [{ referenceId: 1, severity: 'moderate', notes: 'Mild rash' }],
        chronic_conditions: [{ referenceId: 2, status: 'active', notes: 'Routine monitoring' }],
        medications: [{
          name: 'Metformin',
          dosage: { amount: '500', unit: 'mg' },
          frequency: { timesPerDay: 2, interval: 'daily', schedule: ['breakfast', 'dinner'] }
        }]
      },
      notification_preferences: {
        mealReminders: true,
        waterReminders: false
      },
      ui_settings: {
        language: 'en',
        theme: 'dark',
        font_size: '18px'
      }
    });

    expect(errors).to.deep.equal([]);
  });
});
