const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const EMPTY_HEALTH_CONTEXT = { allergies: [], chronic_conditions: [], medications: [] };

function makeStubs(overrides = {}) {
  const rpc = sinon.stub().resolves({ error: null });
  const from = sinon.stub().callsFake(() => ({
    delete: sinon.stub().returns({ eq: sinon.stub().resolves({ error: null }) }),
    insert: sinon.stub().resolves({ error: null })
  }));
  const saveUserPreferenceState = sinon.stub().callsFake(async (userId, fn) => fn({}));
  const fetchUserPreferences = sinon.stub().resolves({
    dietary_requirements: [],
    allergies: [],
    cuisines: [],
    dislikes: [],
    health_conditions: [],
    spice_levels: [],
    cooking_methods: [],
    health_context: EMPTY_HEALTH_CONTEXT,
    notification_preferences: {},
    ui_settings: {}
  });

  return proxyquire('../../model/updateUserPreferences', {
    '../dbConnection.js': { rpc, from },
    './userPreferenceState': { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState },
    './fetchUserPreferences': fetchUserPreferences,
    '../services/serviceError': require('../../services/serviceError'),
    ...overrides
  });
}

describe('updateUserPreferences', () => {
  afterEach(() => sinon.restore());

  // ── Validation ─────────────────────────────────────────────────────────────

  it('rejects invalid user ids with a 400 status', async () => {
    const update = makeStubs();
    try {
      await update(0, { dietary_requirements: [] });
      throw new Error('Expected rejection');
    } catch (err) {
      expect(err.statusCode).to.equal(400);
    }
  });

  it('rejects when no supported fields are provided', async () => {
    const update = makeStubs();
    try {
      await update(1, { unsupported_field: 'foo' });
      throw new Error('Expected rejection');
    } catch (err) {
      expect(err.statusCode).to.equal(400);
      expect(err.message).to.match(/no supported preference fields/i);
    }
  });

  // ── Flat legacy payload ────────────────────────────────────────────────────

  it('replaces join tables via RPC for flat payload', async () => {
    const rpc = sinon.stub().resolves({ error: null });
    const saveUserPreferenceState = sinon.stub().callsFake(async (userId, fn) => fn({}));
    const fetchUserPreferences = sinon.stub().resolves({
      dietary_requirements: [], allergies: [], cuisines: [],
      dislikes: [], health_conditions: [], spice_levels: [], cooking_methods: []
    });

    const update = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc },
      './userPreferenceState': { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState },
      './fetchUserPreferences': fetchUserPreferences,
      '../services/serviceError': require('../../services/serviceError')
    });

    await update(42, {
      dietary_requirements: [1, '2', 2, -1],
      allergies: [3],
      cuisines: [4],
      dislikes: [5],
      health_conditions: [6],
      spice_levels: [7],
      cooking_methods: [8]
    });

    expect(rpc.calledOnce).to.equal(true);
    expect(rpc.firstCall.args[0]).to.equal('replace_user_preferences');
    expect(rpc.firstCall.args[1]).to.deep.equal({
      p_user_id: 42,
      p_dietary_requirements: [1, 2],
      p_allergies: [3],
      p_cuisines: [4],
      p_dislikes: [5],
      p_health_conditions: [6],
      p_spice_levels: [7],
      p_cooking_methods: [8]
    });
    expect(saveUserPreferenceState.called).to.equal(false);
  });

  // ── Canonical nested payload ───────────────────────────────────────────────

  it('accepts canonical nested food_preferences payload', async () => {
    const rpc = sinon.stub().resolves({ error: null });
    const saveUserPreferenceState = sinon.stub().callsFake(async (userId, fn) => fn({}));
    const fetchUserPreferences = sinon.stub().resolves({
      dietary_requirements: [], allergies: [], cuisines: [],
      dislikes: [], health_conditions: [], spice_levels: [], cooking_methods: []
    });

    const update = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc },
      './userPreferenceState': { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState },
      './fetchUserPreferences': fetchUserPreferences,
      '../services/serviceError': require('../../services/serviceError')
    });

    await update(42, {
      food_preferences: {
        dietary_requirements: [1, 2],
        cuisines: [3],
        dislikes: [],
        spice_levels: [4],
        cooking_methods: []
      }
    });

    expect(rpc.calledOnce).to.equal(true);
    expect(rpc.firstCall.args[1].p_dietary_requirements).to.deep.equal([1, 2]);
    expect(rpc.firstCall.args[1].p_cuisines).to.deep.equal([3]);
  });

  it('accepts { id } and { referenceId } objects in nested payload', async () => {
    const rpc = sinon.stub().resolves({ error: null });
    const saveUserPreferenceState = sinon.stub().callsFake(async (userId, fn) => fn({}));
    const fetchUserPreferences = sinon.stub().resolves({
      dietary_requirements: [], allergies: [], cuisines: [],
      dislikes: [], health_conditions: [], spice_levels: [], cooking_methods: []
    });

    const update = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc },
      './userPreferenceState': { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState },
      './fetchUserPreferences': fetchUserPreferences,
      '../services/serviceError': require('../../services/serviceError')
    });

    await update(42, {
      food_preferences: {
        dietary_requirements: [{ id: 1 }, { referenceId: 2 }, 3],
        cuisines: [],
        dislikes: [],
        spice_levels: [],
        cooking_methods: []
      }
    });

    expect(rpc.firstCall.args[1].p_dietary_requirements).to.deep.equal([1, 2, 3]);
  });

  // ── Partial update safety ──────────────────────────────────────────────────

  it('does NOT wipe unrelated join tables when only ui_settings is updated', async () => {
    const rpc = sinon.stub().resolves({ error: null });
    const saveUserPreferenceState = sinon.stub().callsFake(async (userId, fn) => fn({}));
    const fetchUserPreferences = sinon.stub().resolves({
      dietary_requirements: [1, 2],
      allergies: [3],
      cuisines: [4],
      dislikes: [],
      health_conditions: [],
      spice_levels: [],
      cooking_methods: []
    });

    const update = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc },
      './userPreferenceState': { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState },
      './fetchUserPreferences': fetchUserPreferences,
      '../services/serviceError': require('../../services/serviceError')
    });

    await update(42, { ui_settings: { theme: 'dark' } });

    // RPC should NOT be called — no join table changes
    expect(rpc.called).to.equal(false);
    // Only saveUserPreferenceState should be called
    expect(saveUserPreferenceState.calledOnce).to.equal(true);
  });

  it('does NOT wipe food preferences when only health_context is updated', async () => {
    const rpc = sinon.stub().resolves({ error: null });
    const saveUserPreferenceState = sinon.stub().callsFake(async (userId, fn) => fn({}));
    const fetchUserPreferences = sinon.stub().resolves({
      dietary_requirements: [1, 2],
      allergies: [3],
      cuisines: [4],
      dislikes: [],
      health_conditions: [],
      spice_levels: [],
      cooking_methods: []
    });

    const update = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc },
      './userPreferenceState': { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState },
      './fetchUserPreferences': fetchUserPreferences,
      '../services/serviceError': require('../../services/serviceError')
    });

    await update(42, {
      health_context: {
        medications: [{ name: 'Aspirin', active: true }]
      }
    });

    expect(rpc.called).to.equal(false);
    expect(saveUserPreferenceState.calledOnce).to.equal(true);
  });

  // ── Notification merging ───────────────────────────────────────────────────

  it('merges notification_preferences with existing stored values', async () => {
    let capturedMerger;
    const saveUserPreferenceState = sinon.stub().callsFake(async (userId, fn) => {
      capturedMerger = fn;
      return fn({ notification_preferences: { mealReminders: true, weeklyReports: false } });
    });
    const fetchUserPreferences = sinon.stub().resolves({
      dietary_requirements: [], allergies: [], cuisines: [],
      dislikes: [], health_conditions: [], spice_levels: [], cooking_methods: []
    });

    const update = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc: sinon.stub() },
      './userPreferenceState': { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState },
      './fetchUserPreferences': fetchUserPreferences,
      '../services/serviceError': require('../../services/serviceError')
    });

    await update(42, {
      notification_preferences: { weeklyReports: true }
    });

    const result = capturedMerger({ notification_preferences: { mealReminders: true, weeklyReports: false } });
    expect(result.notification_preferences.weeklyReports).to.equal(true);
    expect(result.notification_preferences.mealReminders).to.equal(true);
  });

  // ── RPC fallback ───────────────────────────────────────────────────────────

  it('falls back to join-table replacement when RPC is missing', async () => {
    const rpc = sinon.stub().resolves({
      error: { code: 'PGRST202', message: 'Could not find function public.replace_user_preferences' }
    });
    const from = sinon.stub().callsFake(() => ({
      delete: sinon.stub().returns({ eq: sinon.stub().resolves({ error: null }) }),
      insert: sinon.stub().resolves({ error: null })
    }));
    const saveUserPreferenceState = sinon.stub().callsFake(async (userId, fn) => fn({}));
    const fetchUserPreferences = sinon.stub().resolves({
      dietary_requirements: [], allergies: [], cuisines: [],
      dislikes: [], health_conditions: [], spice_levels: [], cooking_methods: []
    });

    const update = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc, from },
      './userPreferenceState': { EMPTY_HEALTH_CONTEXT, saveUserPreferenceState },
      './fetchUserPreferences': fetchUserPreferences,
      '../services/serviceError': require('../../services/serviceError')
    });

    await update(42, {
      dietary_requirements: [1],
      allergies: [2],
      cuisines: [],
      dislikes: [],
      health_conditions: [],
      spice_levels: [],
      cooking_methods: []
    });

    expect(rpc.calledOnce).to.equal(true);
    expect(from.called).to.equal(true);
    const touchedTables = [...new Set(from.getCalls().map((c) => c.args[0]))];
    expect(touchedTables).to.include.members([
      'user_dietary_requirements',
      'user_allergies',
      'user_cuisines',
      'user_dislikes',
      'user_health_conditions',
      'user_spice_levels',
      'user_cooking_methods'
    ]);
  });
});
