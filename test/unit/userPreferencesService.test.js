/**
 * Unit tests for userPreferencesService.js
 *
 * These tests exercise pure normalization functions without hitting the database
 * or the file-based preference store.
 */
const assert = require('assert');
const {
  buildStructuredHealthContext,
  buildExtendedPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_UI_SETTINGS,
  USER_PREFERENCES_CONTRACT_VERSION,
} = require('../../services/userPreferencesService');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRawPrefs(overrides = {}) {
  return {
    dietary_requirements: [],
    allergies: [],
    cuisines: [],
    dislikes: [],
    health_conditions: [],
    spice_levels: [],
    cooking_methods: [],
    health_context: { allergies: [], chronic_conditions: [], medications: [] },
    notification_preferences: {},
    ui_settings: {},
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// buildStructuredHealthContext
// ─────────────────────────────────────────────────────────────────────────────

describe('buildStructuredHealthContext', () => {
  it('returns empty arrays when given empty preferences', () => {
    const result = buildStructuredHealthContext(makeRawPrefs());
    assert.deepStrictEqual(result.allergies, []);
    assert.deepStrictEqual(result.chronic_conditions, []);
    assert.deepStrictEqual(result.medications, []);
    assert.deepStrictEqual(result.normalized_summary.allergyNames, []);
    assert.deepStrictEqual(result.normalized_summary.chronicConditionNames, []);
    assert.deepStrictEqual(result.normalized_summary.activeMedicationNames, []);
  });

  // ── Allergies ──────────────────────────────────────────────────────────────

  it('merges DB-sourced allergies with health_context severity details', () => {
    const raw = makeRawPrefs({
      allergies: [{ id: 1, name: 'Peanuts' }, { id: 2, name: 'Shellfish' }],
      health_context: {
        allergies: [
          { referenceId: 1, name: 'Peanuts', severity: 'severe', notes: 'Carries EpiPen' },
        ],
        chronic_conditions: [],
        medications: [],
      },
    });
    const result = buildStructuredHealthContext(raw);

    assert.strictEqual(result.allergies.length, 2);
    const peanut = result.allergies.find((a) => a.referenceId === 1);
    assert.strictEqual(peanut.severity, 'severe');
    assert.strictEqual(peanut.notes, 'Carries EpiPen');

    const shellfish = result.allergies.find((a) => a.referenceId === 2);
    assert.strictEqual(shellfish.severity, 'unknown', 'defaults to unknown when no detail stored');
  });

  it('includes freeform (non-DB) allergies from health_context', () => {
    const raw = makeRawPrefs({
      allergies: [],
      health_context: {
        allergies: [{ referenceId: null, name: 'Kiwi', severity: 'mild', notes: null }],
        chronic_conditions: [],
        medications: [],
      },
    });
    const result = buildStructuredHealthContext(raw);
    assert.strictEqual(result.allergies.length, 1);
    assert.strictEqual(result.allergies[0].name, 'Kiwi');
  });

  it('populates normalized_summary.allergyNames as lowercase', () => {
    const raw = makeRawPrefs({
      allergies: [{ id: 3, name: 'Tree Nuts' }],
      health_context: { allergies: [], chronic_conditions: [], medications: [] },
    });
    const result = buildStructuredHealthContext(raw);
    assert.ok(result.normalized_summary.allergyNames.includes('tree nuts'));
  });

  it('deduplicates allergyNames in normalized_summary', () => {
    const raw = makeRawPrefs({
      allergies: [{ id: 1, name: 'milk' }, { id: 2, name: 'Milk' }],
      health_context: {
        allergies: [
          { referenceId: 1, name: 'milk', severity: 'mild', notes: null },
          { referenceId: 2, name: 'Milk', severity: 'mild', notes: null },
        ],
        chronic_conditions: [],
        medications: [],
      },
    });
    const result = buildStructuredHealthContext(raw);
    const milkEntries = result.normalized_summary.allergyNames.filter((n) => n === 'milk');
    assert.strictEqual(milkEntries.length, 1);
  });

  // ── Chronic conditions ─────────────────────────────────────────────────────

  it('merges DB-sourced conditions with health_context status details', () => {
    const raw = makeRawPrefs({
      health_conditions: [{ id: 10, name: 'Type 2 Diabetes' }],
      health_context: {
        allergies: [],
        chronic_conditions: [
          { referenceId: 10, name: 'Type 2 Diabetes', status: 'managed', notes: 'On metformin' },
        ],
        medications: [],
      },
    });
    const result = buildStructuredHealthContext(raw);
    assert.strictEqual(result.chronic_conditions.length, 1);
    assert.strictEqual(result.chronic_conditions[0].status, 'managed');
    assert.strictEqual(result.chronic_conditions[0].notes, 'On metformin');
  });

  it('defaults condition status to active when not provided', () => {
    const raw = makeRawPrefs({
      health_conditions: [{ id: 5, name: 'Hypertension' }],
      health_context: { allergies: [], chronic_conditions: [], medications: [] },
    });
    const result = buildStructuredHealthContext(raw);
    assert.strictEqual(result.chronic_conditions[0].status, 'active');
  });

  // ── Medications ────────────────────────────────────────────────────────────

  it('normalizes a complete medication entry', () => {
    const raw = makeRawPrefs({
      health_context: {
        allergies: [],
        chronic_conditions: [],
        medications: [
          {
            name: 'Metformin',
            dosage: { amount: '500', unit: 'mg' },
            frequency: { timesPerDay: 2, interval: null, schedule: ['morning', 'evening'], asNeeded: false },
            purpose: 'Blood sugar control',
            notes: null,
            active: true,
          },
        ],
      },
    });
    const result = buildStructuredHealthContext(raw);
    assert.strictEqual(result.medications.length, 1);
    const med = result.medications[0];
    assert.strictEqual(med.name, 'Metformin');
    assert.strictEqual(med.dosage.amount, '500');
    assert.strictEqual(med.dosage.unit, 'mg');
    assert.strictEqual(med.frequency.timesPerDay, 2);
    assert.deepStrictEqual(med.frequency.schedule, ['morning', 'evening']);
    assert.strictEqual(med.active, true);
  });

  it('excludes medication entries with no name', () => {
    const raw = makeRawPrefs({
      health_context: {
        allergies: [],
        chronic_conditions: [],
        medications: [
          { name: '', dosage: { amount: null, unit: null }, frequency: {} },
          { name: 'Aspirin', dosage: { amount: '100', unit: 'mg' }, frequency: {} },
        ],
      },
    });
    const result = buildStructuredHealthContext(raw);
    assert.strictEqual(result.medications.length, 1);
    assert.strictEqual(result.medications[0].name, 'Aspirin');
  });

  it('omits inactive medications from activeMedicationNames', () => {
    const raw = makeRawPrefs({
      health_context: {
        allergies: [],
        chronic_conditions: [],
        medications: [
          { name: 'Ibuprofen', active: false },
          { name: 'Vitamin D', active: true },
        ],
      },
    });
    const result = buildStructuredHealthContext(raw);
    assert.ok(!result.normalized_summary.activeMedicationNames.includes('ibuprofen'));
    assert.ok(result.normalized_summary.activeMedicationNames.includes('vitamin d'));
  });

  it('generates auto-id for medication when id is absent', () => {
    const raw = makeRawPrefs({
      health_context: {
        allergies: [],
        chronic_conditions: [],
        medications: [{ name: 'Paracetamol' }],
      },
    });
    const result = buildStructuredHealthContext(raw);
    assert.ok(result.medications[0].id, 'medication should have an auto-generated id');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildExtendedPreferences
// ─────────────────────────────────────────────────────────────────────────────

describe('buildExtendedPreferences', () => {
  it('returns success:true with contractVersion', () => {
    const result = buildExtendedPreferences(makeRawPrefs());
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.contractVersion, USER_PREFERENCES_CONTRACT_VERSION);
  });

  it('merges notification defaults with stored overrides', () => {
    const raw = makeRawPrefs({
      notification_preferences: { weeklyReports: true, mealReminders: false },
    });
    const result = buildExtendedPreferences(raw);
    const notif = result.data.notification_preferences;
    assert.strictEqual(notif.weeklyReports, true);
    assert.strictEqual(notif.mealReminders, false);
    // defaults preserved for untouched fields
    assert.strictEqual(notif.waterReminders, DEFAULT_NOTIFICATION_PREFERENCES.waterReminders);
    assert.strictEqual(notif.systemUpdates, DEFAULT_NOTIFICATION_PREFERENCES.systemUpdates);
  });

  it('merges ui_settings defaults with stored overrides', () => {
    const raw = makeRawPrefs({ ui_settings: { theme: 'dark' } });
    const result = buildExtendedPreferences(raw);
    const ui = result.data.ui_settings;
    assert.strictEqual(ui.theme, 'dark');
    assert.strictEqual(ui.language, DEFAULT_UI_SETTINGS.language);
    assert.strictEqual(ui.font_size, DEFAULT_UI_SETTINGS.font_size);
  });

  it('groups food preferences under food_preferences key', () => {
    const raw = makeRawPrefs({
      dietary_requirements: [{ id: 1, name: 'Vegan' }],
      cuisines: [{ id: 3, name: 'Italian' }],
    });
    const result = buildExtendedPreferences(raw);
    assert.ok(Array.isArray(result.data.food_preferences.dietary_requirements));
    assert.ok(Array.isArray(result.data.food_preferences.cuisines));
    assert.strictEqual(result.data.food_preferences.dietary_requirements[0].name, 'Vegan');
  });
});
