const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Supabase client configuration contracts', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    sinon.restore();

    delete require.cache[require.resolve('../../database/supabase.js')];
    delete require.cache[require.resolve('../../database/supabaseClient.js')];
    delete require.cache[require.resolve('../../services/supabaseClient.js')];
  });

  it('fails closed when required Supabase configuration is missing', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const createClient = sinon.stub();

    expect(() =>
      proxyquire('../../database/supabase.js', {
        '@supabase/supabase-js': { createClient }
      })
    ).to.throw(
      '[supabase] SUPABASE_URL and SUPABASE_ANON_KEY are required.'
    );

    expect(createClient.called).to.equal(false);
  });

  it('allows startup without a service-role key and disables privileged client', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const anonClient = { kind: 'anon' };
    const createClient = sinon.stub().returns(anonClient);
    const warn = sinon.stub(console, 'warn');

    const config = proxyquire('../../database/supabase.js', {
      '@supabase/supabase-js': { createClient }
    });

    expect(config.supabaseAnon).to.equal(anonClient);
    expect(config.supabaseServiceRole).to.equal(null);

    expect(
      createClient.calledOnceWith(
        'https://example.supabase.co',
        'anon-test-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
    ).to.equal(true);

    expect(warn.calledOnce).to.equal(true);
  });

  it('preserves legacy compatibility aliases and shims', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

    const anonClient = { kind: 'anon' };
    const serviceClient = { kind: 'service' };

    const createClient = sinon.stub();
    createClient.onFirstCall().returns(anonClient);
    createClient.onSecondCall().returns(serviceClient);

    const canonical = proxyquire('../../database/supabase.js', {
      '@supabase/supabase-js': { createClient }
    });

    expect(canonical.supabase).to.equal(canonical.supabaseAnon);
    expect(canonical.supabaseAdmin).to.equal(canonical.supabaseServiceRole);

    const databaseShim = proxyquire('../../database/supabaseClient.js', {
      './supabase': canonical
    });

    expect(databaseShim).to.equal(canonical.supabaseAnon);

    const servicesShim = proxyquire('../../services/supabaseClient.js', {
      '../database/supabase': canonical
    });

    expect(servicesShim.supabaseAnon).to.equal(canonical.supabaseAnon);
    expect(servicesShim.supabaseService).to.equal(
      canonical.supabaseServiceRole
    );
    expect(servicesShim.getSupabaseServiceClient()).to.equal(
      canonical.supabaseServiceRole
    );
  });

  it('creates a user-scoped client with the expected Authorization header', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const anonClient = { kind: 'anon' };
    const userClient = { kind: 'user' };

    const createClient = sinon.stub();
    createClient.onFirstCall().returns(anonClient);
    createClient.onSecondCall().returns(userClient);

    const warn = sinon.stub(console, 'warn');

    const {
      createUserClient
    } = proxyquire('../../database/supabase.js', {
      '@supabase/supabase-js': { createClient }
    });

    const result = createUserClient('test-user-token');

    expect(result).to.equal(userClient);

    expect(
      createClient.secondCall.calledWith(
        'https://example.supabase.co',
        'anon-test-key'
      )
    ).to.equal(true);

    const options = createClient.secondCall.args[2];

    expect(options.auth).to.deep.equal({
      autoRefreshToken: false,
      persistSession: false
    });

    expect(options.global.headers.Authorization).to.equal(
      'Bearer test-user-token'
    );

    expect(warn.calledOnce).to.equal(true);
  });

  it('rejects an empty token instead of silently creating an anon user client', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const anonClient = { kind: 'anon' };
    const createClient = sinon.stub().returns(anonClient);
    const warn = sinon.stub(console, 'warn');

    const {
      createUserClient
    } = proxyquire('../../database/supabase.js', {
      '@supabase/supabase-js': { createClient }
    });

    expect(() => createUserClient()).to.throw(
      '[supabase] accessToken is required to create a user-scoped client.'
    );

    expect(createClient.callCount).to.equal(1);
    expect(warn.calledOnce).to.equal(true);
  });
});
