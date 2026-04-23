const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('updateUserPreferences', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('replaces preference rows through the RPC transaction', async () => {
    const rpc = sinon.stub().resolves({ error: null });
    const saveUserPreferenceState = sinon.stub().resolves();

    const updateUserPreferences = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc },
      './userPreferenceState': {
        EMPTY_HEALTH_CONTEXT: { allergies: [], chronic_conditions: [], medications: [] },
        saveUserPreferenceState
      }
    });

    await updateUserPreferences(42, {
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

  it('rejects invalid user ids with a 400 status', async () => {
    const updateUserPreferences = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc: sinon.stub() },
      './userPreferenceState': {
        EMPTY_HEALTH_CONTEXT: { allergies: [], chronic_conditions: [], medications: [] },
        saveUserPreferenceState: sinon.stub()
      }
    });

    try {
      await updateUserPreferences(0, {
        dietary_requirements: [],
        allergies: [],
        cuisines: [],
        dislikes: [],
        health_conditions: [],
        spice_levels: [],
        cooking_methods: []
      });
      throw new Error('Expected updateUserPreferences to reject');
    } catch (error) {
      expect(error.statusCode).to.equal(400);
    }
  });

  it('returns a clear error when the RPC migration is missing', async () => {
    const rpc = sinon.stub().resolves({
      error: {
        code: 'PGRST202',
        message: 'Could not find function public.replace_user_preferences'
      }
    });

    const updateUserPreferences = proxyquire('../../model/updateUserPreferences', {
      '../dbConnection.js': { rpc },
      './userPreferenceState': {
        EMPTY_HEALTH_CONTEXT: { allergies: [], chronic_conditions: [], medications: [] },
        saveUserPreferenceState: sinon.stub()
      }
    });

    try {
      await updateUserPreferences(42, {
        dietary_requirements: [],
        allergies: [],
        cuisines: [],
        dislikes: [],
        health_conditions: [],
        spice_levels: [],
        cooking_methods: []
      });
      throw new Error('Expected updateUserPreferences to reject');
    } catch (error) {
      expect(error.statusCode).to.equal(500);
      expect(error.message).to.include('replace_user_preferences');
      expect(error.message).to.include('user-preferences-transaction.sql');
    }
  });
});
