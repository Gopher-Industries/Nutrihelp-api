const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

describe('migrate-encrypt-health-context', () => {
  afterEach(() => {
    sinon.restore();
  });

  function buildSupabaseStub(writtenRow) {
    const single = sinon.stub().resolves({
      data: writtenRow,
      error: null,
    });

    const select = sinon.stub().returns({ single });
    const is = sinon.stub().returns({ select });
    const eq = sinon.stub().returns({ is });
    const update = sinon.stub().returns({ eq });
    const from = sinon.stub().returns({ update });

    return {
      client: { from },
      from,
      update,
    };
  }

  it('encrypts, clears plaintext, and verifies the migrated row', async () => {
    const healthContext = {
      allergies: [{ name: 'Peanuts', severity: 'high' }],
      chronic_conditions: [{ name: 'Diabetes', status: 'active' }],
      medications: [{ name: 'Metformin' }],
    };

    const writtenRow = {
      user_id: 42,
      health_context: null,
      health_context_encrypted: 'ciphertext',
      health_context_encryption_iv: 'iv-value',
      health_context_encryption_auth_tag: 'auth-tag',
      health_context_encryption_key_version: 'v1',
    };

    const supabase = buildSupabaseStub(writtenRow);

    const encryptForDatabase = sinon.stub().resolves({
      encrypted: 'ciphertext',
      iv: 'iv-value',
      authTag: 'auth-tag',
      keyVersion: 'v1',
    });

    const decryptFromDatabase = sinon.stub();
    decryptFromDatabase.onCall(0).resolves(healthContext);
    decryptFromDatabase.onCall(1).resolves(healthContext);

    const { processRow } = proxyquire(
      '../../scripts/migrate-encrypt-health-context',
      {
        '../database/supabaseClient': supabase.client,
        '../services/encryptionService': {
          encryptForDatabase,
          decryptFromDatabase,
        },
      }
    );

    const result = await processRow({
      user_id: 42,
      health_context: healthContext,
    });

    expect(result).to.equal(true);
    expect(encryptForDatabase.calledOnceWith(healthContext)).to.equal(true);
    expect(decryptFromDatabase.callCount).to.equal(2);

    expect(supabase.update.calledOnce).to.equal(true);
    const payload = supabase.update.firstCall.args[0];

    expect(payload.health_context).to.equal(null);
    expect(payload.health_context_encrypted).to.equal('ciphertext');
    expect(payload.health_context_encryption_iv).to.equal('iv-value');
    expect(payload.health_context_encryption_auth_tag).to.equal('auth-tag');
    expect(payload.health_context_encryption_key_version).to.equal('v1');
    expect(payload.health_context_encrypted_at).to.be.a('string');
  });

  it('does not write when pre-write encryption verification fails', async () => {
    const healthContext = {
      allergies: [],
      chronic_conditions: [{ name: 'Diabetes' }],
      medications: [],
    };

    const supabase = buildSupabaseStub(null);

    const encryptForDatabase = sinon.stub().resolves({
      encrypted: 'ciphertext',
      iv: 'iv-value',
      authTag: 'auth-tag',
      keyVersion: 'v1',
    });

    const decryptFromDatabase = sinon.stub().resolves({
      allergies: [],
      chronic_conditions: [],
      medications: [],
    });

    const { processRow } = proxyquire(
      '../../scripts/migrate-encrypt-health-context',
      {
        '../database/supabaseClient': supabase.client,
        '../services/encryptionService': {
          encryptForDatabase,
          decryptFromDatabase,
        },
      }
    );

    let error;
    try {
      await processRow({
        user_id: 42,
        health_context: healthContext,
      });
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.include('Pre-write encryption verification failed');
    expect(supabase.from.called).to.equal(false);
  });

  it('skips rows without plaintext health_context', async () => {
    const supabase = buildSupabaseStub(null);
    const encryptForDatabase = sinon.stub();
    const decryptFromDatabase = sinon.stub();

    const { processRow } = proxyquire(
      '../../scripts/migrate-encrypt-health-context',
      {
        '../database/supabaseClient': supabase.client,
        '../services/encryptionService': {
          encryptForDatabase,
          decryptFromDatabase,
        },
      }
    );

    const result = await processRow({
      user_id: 42,
      health_context: null,
    });

    expect(result).to.equal(false);
    expect(encryptForDatabase.called).to.equal(false);
    expect(supabase.from.called).to.equal(false);
  });
});
