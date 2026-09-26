const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();

describe('User Preferences Service', () => {
  it('builds structured health context and separates settings payloads', async () => {
    const service = proxyquire('../services/userPreferencesService', {
      '../model/fetchUserPreferences': async () => ({
        dietary_requirements: [{ id: 1, name: 'Vegetarian' }],
        allergies: [{ id: 2, name: 'Peanuts' }],
        cuisines: [],
        dislikes: [],
        health_conditions: [{ id: 3, name: 'Diabetes' }],
        spice_levels: [],
        cooking_methods: [],
        health_context: {
          allergies: [{ referenceId: 2, severity: 'severe', notes: 'Carries epipen' }],
          chronic_conditions: [{ referenceId: 3, status: 'managed', notes: 'Monitor sugar daily' }],
          medications: [{
            name: 'Metformin',
            dosage: { amount: '500', unit: 'mg' },
            frequency: { timesPerDay: 2, interval: 'daily', schedule: ['breakfast', 'dinner'] }
          }]
        },
        notification_preferences: { weeklyReports: true },
        ui_settings: { theme: 'dark' }
      }),
      '../model/updateUserPreferences': async () => {}
    });

    const result = await service.getExtendedPreferences(99);

    expect(result.success).to.equal(true);
    expect(result.contractVersion).to.equal('user-preferences-v2');
    expect(result.data.food_preferences.dietary_requirements[0]).to.deep.equal({ id: 1, name: 'Vegetarian' });
    expect(result.data.health_context.allergies[0]).to.deep.equal({
      referenceId: 2,
      name: 'Peanuts',
      severity: 'severe',
      notes: 'Carries epipen'
    });
    expect(result.data.health_context.chronic_conditions[0]).to.deep.equal({
      referenceId: 3,
      name: 'Diabetes',
      status: 'managed',
      notes: 'Monitor sugar daily'
    });
    expect(result.data.health_context.medications[0]).to.deep.include({
      name: 'Metformin',
      active: true
    });
    expect(result.data.notification_preferences).to.deep.include({ weeklyReports: true, mealReminders: true });
    expect(result.data.ui_settings).to.deep.include({ theme: 'dark', language: 'en' });
  });
});
