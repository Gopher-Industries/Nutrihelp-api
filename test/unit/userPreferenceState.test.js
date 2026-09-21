const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

describe('userPreferenceState model', () => {
  afterEach(() => {
    sinon.restore();
  });

  function encryptionStubs(overrides = {}) {
    return {
      encryptForDatabase:
        overrides.encryptForDatabase ||
        sinon.stub().resolves({
          encrypted: 'ciphertext',
          iv: 'iv-value',
          authTag: 'auth-tag',
          keyVersion: 'v1',
        }),
      decryptFromDatabase:
        overrides.decryptFromDatabase ||
        sinon.stub().resolves({
          allergies: [],
          chronic_conditions: [],
          medications: [],
        }),
    };
  }

  it('returns normalized defaults when no state row exists', async () => {
    const maybeSingle = sinon.stub().resolves({ data: null, error: null });
    const eq = sinon.stub().returns({ maybeSingle });
    const select = sinon.stub().returns({ eq });
    const from = sinon.stub().returns({ select });
    const encryption = encryptionStubs();

    const { getUserPreferenceState } = proxyquire(
      '../../model/userPreferenceState',
      {
        '../dbConnection.js': { from },
        '../services/encryptionService': encryption,
      }
    );

    const state = await getUserPreferenceState(42);

    expect(from.calledWith('user_preference_states')).to.equal(true);
    expect(encryption.decryptFromDatabase.called).to.equal(false);
    expect(state).to.deep.equal({
      health_context: {
        allergies: [],
        chronic_conditions: [],
        medications: [],
      },
      notification_preferences: {},
      ui_settings: {},
    });
  });

  it('reads legacy plaintext health_context for migration compatibility', async () => {
    const maybeSingle = sinon.stub().resolves({
      data: {
        health_context: {
          allergies: [{ name: 'Peanuts' }],
          chronic_conditions: [{ name: 'Diabetes' }],
          medications: [{ name: 'Metformin' }],
        },
        notification_preferences: { mealReminders: true },
        ui_settings: { theme: 'dark' },
      },
      error: null,
    });

    const eq = sinon.stub().returns({ maybeSingle });
    const select = sinon.stub().returns({ eq });
    const from = sinon.stub().returns({ select });
    const encryption = encryptionStubs();

    const { getUserPreferenceState } = proxyquire(
      '../../model/userPreferenceState',
      {
        '../dbConnection.js': { from },
        '../services/encryptionService': encryption,
      }
    );

    const state = await getUserPreferenceState(42);

    expect(encryption.decryptFromDatabase.called).to.equal(false);
    expect(state.health_context).to.deep.equal({
      allergies: [{ name: 'Peanuts' }],
      chronic_conditions: [{ name: 'Diabetes' }],
      medications: [{ name: 'Metformin' }],
    });
  });

  it('decrypts encrypted health_context on read', async () => {
    const encryptedRow = {
      health_context: null,
      health_context_encrypted: 'ciphertext',
      health_context_encryption_iv: 'iv-value',
      health_context_encryption_auth_tag: 'auth-tag',
      health_context_encryption_key_version: 'v1',
      health_context_encrypted_at: '2026-09-22T00:00:00.000Z',
      notification_preferences: {},
      ui_settings: {},
    };

    const maybeSingle = sinon.stub().resolves({
      data: encryptedRow,
      error: null,
    });
    const eq = sinon.stub().returns({ maybeSingle });
    const select = sinon.stub().returns({ eq });
    const from = sinon.stub().returns({ select });

    const decryptFromDatabase = sinon.stub().resolves({
      allergies: [{ name: 'Peanuts', severity: 'high' }],
      chronic_conditions: [{ name: 'Diabetes', status: 'active' }],
      medications: [{ name: 'Metformin', dosage: { amount: 500, unit: 'mg' } }],
    });

    const encryption = encryptionStubs({ decryptFromDatabase });

    const { getUserPreferenceState } = proxyquire(
      '../../model/userPreferenceState',
      {
        '../dbConnection.js': { from },
        '../services/encryptionService': encryption,
      }
    );

    const state = await getUserPreferenceState(42);

    expect(decryptFromDatabase.calledOnce).to.equal(true);
    expect(decryptFromDatabase.firstCall.args[0]).to.equal(encryptedRow);
    expect(decryptFromDatabase.firstCall.args[1]).to.deep.equal({
      encrypted: 'health_context_encrypted',
      iv: 'health_context_encryption_iv',
      authTag: 'health_context_encryption_auth_tag',
    });

    expect(state.health_context.medications[0].name).to.equal('Metformin');
  });

  it('fails closed when an encrypted health_context payload is incomplete', async () => {
    const maybeSingle = sinon.stub().resolves({
      data: {
        health_context: {
          allergies: [{ name: 'Peanuts' }],
          chronic_conditions: [],
          medications: [],
        },
        health_context_encrypted: 'ciphertext',
        health_context_encryption_iv: null,
        health_context_encryption_auth_tag: 'auth-tag',
        notification_preferences: {},
        ui_settings: {},
      },
      error: null,
    });

    const eq = sinon.stub().returns({ maybeSingle });
    const select = sinon.stub().returns({ eq });
    const from = sinon.stub().returns({ select });
    const encryption = encryptionStubs();

    const { getUserPreferenceState } = proxyquire(
      '../../model/userPreferenceState',
      {
        '../dbConnection.js': { from },
        '../services/encryptionService': encryption,
      }
    );

    let error;
    try {
      await getUserPreferenceState(42);
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.include('Incomplete encrypted health_context payload');
    expect(encryption.decryptFromDatabase.called).to.equal(false);
  });

  it('fails closed when encryption metadata exists without ciphertext', async () => {
    const maybeSingle = sinon.stub().resolves({
      data: {
        health_context: {
          allergies: [{ name: 'Peanuts' }],
          chronic_conditions: [],
          medications: [],
        },
        health_context_encrypted: null,
        health_context_encryption_iv: null,
        health_context_encryption_auth_tag: null,
        health_context_encryption_key_version: 'v1',
        health_context_encrypted_at: '2026-09-22T00:00:00.000Z',
        notification_preferences: {},
        ui_settings: {},
      },
      error: null,
    });

    const eq = sinon.stub().returns({ maybeSingle });
    const select = sinon.stub().returns({ eq });
    const from = sinon.stub().returns({ select });
    const encryption = encryptionStubs();

    const { getUserPreferenceState } = proxyquire(
      '../../model/userPreferenceState',
      {
        '../dbConnection.js': { from },
        '../services/encryptionService': encryption,
      }
    );

    let error;
    try {
      await getUserPreferenceState(42);
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.include(
      'Incomplete encrypted health_context payload'
    );
    expect(encryption.decryptFromDatabase.called).to.equal(false);
  });

  it('encrypts health_context before storage and clears plaintext', async () => {
    const clock = sinon.useFakeTimers(
      new Date('2026-09-22T00:00:00.000Z').getTime()
    );

    const healthContext = {
      allergies: [{ name: 'Peanuts', severity: 'high' }],
      chronic_conditions: [{ name: 'Diabetes', status: 'active' }],
      medications: [{ name: 'Metformin' }],
    };

    const maybeSingle = sinon.stub().resolves({ data: null, error: null });
    const eq = sinon.stub().returns({ maybeSingle });
    const select = sinon.stub().returns({ eq });

    const single = sinon.stub().resolves({
      data: {
        health_context: null,
        health_context_encrypted: 'ciphertext',
        health_context_encryption_iv: 'iv-value',
        health_context_encryption_auth_tag: 'auth-tag',
        health_context_encryption_key_version: 'v1',
        health_context_encrypted_at: '2026-09-22T00:00:00.000Z',
        notification_preferences: { mealReminders: false },
        ui_settings: { theme: 'dark' },
      },
      error: null,
    });

    const selectAfterUpsert = sinon.stub().returns({ single });
    const upsert = sinon.stub().returns({ select: selectAfterUpsert });

    const from = sinon.stub();
    from.onCall(0).returns({ select });
    from.onCall(1).returns({ upsert });

    const encryptForDatabase = sinon.stub().resolves({
      encrypted: 'ciphertext',
      iv: 'iv-value',
      authTag: 'auth-tag',
      keyVersion: 'v1',
    });
    const decryptFromDatabase = sinon.stub().resolves(healthContext);

    const { saveUserPreferenceState } = proxyquire(
      '../../model/userPreferenceState',
      {
        '../dbConnection.js': { from },
        '../services/encryptionService': {
          encryptForDatabase,
          decryptFromDatabase,
        },
      }
    );

    const state = await saveUserPreferenceState(42, {
      health_context: healthContext,
      notification_preferences: { mealReminders: false },
      ui_settings: { theme: 'dark' },
    });

    expect(encryptForDatabase.calledOnceWith(healthContext)).to.equal(true);
    expect(upsert.calledOnce).to.equal(true);

    expect(upsert.firstCall.args[0]).to.deep.equal({
      user_id: 42,
      health_context: null,
      health_context_encrypted: 'ciphertext',
      health_context_encryption_iv: 'iv-value',
      health_context_encryption_auth_tag: 'auth-tag',
      health_context_encryption_key_version: 'v1',
      health_context_encrypted_at: '2026-09-22T00:00:00.000Z',
      notification_preferences: { mealReminders: false },
      ui_settings: { theme: 'dark' },
    });

    expect(state.health_context).to.deep.equal(healthContext);

    clock.restore();
  });

  it('does not write to the database when health_context encryption fails', async () => {
    const maybeSingle = sinon.stub().resolves({ data: null, error: null });
    const eq = sinon.stub().returns({ maybeSingle });
    const select = sinon.stub().returns({ eq });

    const upsert = sinon.stub();
    const from = sinon.stub();
    from.onCall(0).returns({ select });
    from.onCall(1).returns({ upsert });

    const encryptForDatabase = sinon
      .stub()
      .rejects(new Error('Encryption key unavailable'));

    const { saveUserPreferenceState } = proxyquire(
      '../../model/userPreferenceState',
      {
        '../dbConnection.js': { from },
        '../services/encryptionService': {
          encryptForDatabase,
          decryptFromDatabase: sinon.stub(),
        },
      }
    );

    let error;
    try {
      await saveUserPreferenceState(42, {
        health_context: {
          allergies: [],
          chronic_conditions: [{ name: 'Diabetes' }],
          medications: [],
        },
      });
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.equal('Encryption key unavailable');
    expect(upsert.called).to.equal(false);
  });
});
