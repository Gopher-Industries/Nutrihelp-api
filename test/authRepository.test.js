const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('authRepository refresh token lookup', () => {
  let authRepository;
  let query;

  beforeEach(() => {
    query = {
      select: sinon.stub(),
      eq: sinon.stub(),
      maybeSingle: sinon.stub().resolves({
        data: { id: 1, refresh_token_lookup: 'test-hash' },
        error: null,
      }),
    };

    afterEach(() => {
      sinon.restore();
    });

    query.select.returns(query);
    query.eq.returns(query);

    const serviceClient = {
      from: sinon.stub().returns(query),
    };

    authRepository = proxyquire('../repositories/authRepository', {
      '../database/supabase': {
        supabaseAnon: {},
        supabaseServiceRole: serviceClient,
      },
    });
  });

  describe('findActiveRefreshSessionByLookupHash', () => {
    it("should include an eq filter for token_type = 'refresh' to prevent trusted-device token misuse", async () => {
      const lookupHash = 'dummy-lookup-hash';

      await authRepository.findActiveRefreshSessionByLookupHash(lookupHash);

      // Verify select was called
      expect(query.select.called).to.be.true;

      // Verify all required equality filters are applied in the chain
      expect(
        query.eq.calledWith('refresh_token_lookup', lookupHash),
        'Expected query to filter by refresh_token_lookup'
      ).to.be.true;

      expect(query.eq.calledWith('is_active', true), 'Expected query to filter by is_active = true')
        .to.be.true;

      // Regression check: Ensure token_type is strictly 'refresh'
      expect(
        query.eq.calledWith('token_type', 'refresh'),
        "Regression failure: query must restrict token_type to 'refresh' to prevent trusted-device tokens from passing"
      ).to.be.true;

      expect(query.maybeSingle.called).to.be.true;
    });
  });
});
