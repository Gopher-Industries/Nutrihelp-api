/**
 * FE-06 AI Assessment Prediction Contract: shared contract package tests.
 * The fixtures are the agreement both teams build against, so every fixture
 * must validate against the backend's executable schema.
 */
const { expect } = require('chai');

const contract = require('../../contracts/ai-assessment/v1');
const {
  successBodySchema,
  errorBodySchema,
  validateRequest,
} = require('../../services/aiAssessment/schemas');

const fixture = (name) => require(`../../contracts/ai-assessment/v1/fixtures/${name}.json`);

const SUCCESS_FIXTURES = ['predict-success-ai', 'predict-success-uncertain', 'predict-fallback'];
const ERROR_FIXTURES = ['error-validation', 'error-unauthorised', 'error-rate-limited'];

function stubResponse(status, body) {
  return {
    status,
    json: async () => {
      if (body === undefined) throw new Error('not json');
      return body;
    },
  };
}

describe('FE-06 AI assessment contract package', () => {
  describe('definition', () => {
    it('is versioned and lists unique input fields', () => {
      expect(contract.CONTRACT_VERSION).to.equal('v1');
      const ids = contract.INPUT_FIELDS.map((f) => f.id);
      expect(new Set(ids).size).to.equal(ids.length);
    });

    it('gives every enum field its allowed values and every number its range', () => {
      contract.INPUT_FIELDS.forEach((f) => {
        if (f.type === 'enum') expect(f.values, f.id).to.be.an('array').that.is.not.empty;
        if (f.type === 'number' || f.type === 'integer') {
          expect(f.min, f.id).to.be.a('number');
          expect(f.max, f.id).to.be.greaterThan(f.min);
        }
      });
    });

    it('has no runtime dependencies, so it bundles unchanged in Expo', () => {
      const source = require('fs').readFileSync(require.resolve('../../contracts/ai-assessment/v1'), 'utf8');
      const requires = [...source.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
      requires.forEach((r) => expect(r.startsWith('./fixtures/'), r).to.equal(true));
    });
  });

  describe('fixtures', () => {
    it('the sample request passes backend validation', () => {
      const { errors } = validateRequest(fixture('request-valid'));
      expect(errors).to.equal(undefined);
    });

    SUCCESS_FIXTURES.forEach((name) => {
      it(`${name} matches the success schema`, () => {
        const { httpStatus, body } = fixture(name);
        expect(httpStatus).to.equal(200);
        const { error } = successBodySchema.validate(body, { abortEarly: false });
        expect(error, error && error.message).to.equal(undefined);
      });
    });

    ERROR_FIXTURES.forEach((name) => {
      it(`${name} matches the error schema and uses a known code`, () => {
        const { httpStatus, body } = fixture(name);
        expect(httpStatus).to.be.within(400, 599);
        const { error } = errorBodySchema.validate(body);
        expect(error, error && error.message).to.equal(undefined);
        expect(Object.values(contract.ERROR_CODES)).to.include(body.code);
      });
    });
  });

  describe('toScreenState', () => {
    const okResult = (name) => ({ ok: true, data: fixture(name).body.data });

    it('maps an AI result to ready', () => {
      const s = contract.toScreenState(okResult('predict-success-ai'));
      expect(s.state).to.equal('ready');
      expect(s.prediction.source).to.equal('ai_model');
    });

    it('maps a low-confidence result to uncertain', () => {
      expect(contract.toScreenState(okResult('predict-success-uncertain')).state).to.equal('uncertain');
    });

    it('maps an unavailable model to fallback and allows retry', () => {
      const s = contract.toScreenState(okResult('predict-fallback'));
      expect(s.state).to.equal('fallback');
      expect(s.retryable).to.equal(true);
    });

    it('maps validation errors to per-field messages', () => {
      const body = fixture('error-validation').body;
      const s = contract.toScreenState({ ok: false, code: body.code, errors: body.errors });
      expect(s.state).to.equal('invalid_input');
      expect(s.fieldErrors).to.have.keys(['ageYears', 'transport']);
    });

    it('maps every auth code to needs_login', () => {
      contract.AUTH_ERROR_CODES.forEach((code) => {
        expect(contract.toScreenState({ ok: false, code }).state, code).to.equal('needs_login');
      });
    });

    it('maps rate limiting, version mismatch, network and unknown errors', () => {
      expect(contract.toScreenState({ ok: false, code: 'AI_ASSESSMENT_RATE_LIMITED' }).state).to.equal('rate_limited');
      expect(contract.toScreenState({ ok: false, code: 'CONTRACT_VERSION_UNSUPPORTED' }).title).to.equal('Update needed');
      expect(contract.toScreenState({ ok: false, code: 'NETWORK_ERROR' }).retryable).to.equal(true);
      expect(contract.toScreenState({ ok: false, code: 'SOMETHING_NEW' }).state).to.equal('error');
      expect(contract.toScreenState(null).state).to.equal('error');
      expect(contract.toScreenState({ ok: true, data: {} }).state).to.equal('error');
    });

    it('only ever returns a declared screen state', () => {
      const results = [
        okResult('predict-success-ai'),
        okResult('predict-fallback'),
        { ok: false, code: 'VALIDATION_ERROR' },
        { ok: false, code: 'TOKEN_MISSING' },
        { ok: false, code: 'CLIENT_TIMEOUT' },
      ];
      results.forEach((r) => expect(contract.ENUMS.screenState).to.include(contract.toScreenState(r).state));
    });
  });

  describe('client', () => {
    it('posts the versioned body with the bearer token and unwraps success', async () => {
      let call;
      const client = contract.createAiAssessmentClient({
        baseUrl: 'https://api.test/',
        getAccessToken: async () => 'Bearer abc',
        fetch: async (url, init) => {
          call = { url, init };
          return stubResponse(200, fixture('predict-success-ai').body);
        },
      });
      const result = await client.predict({ sex: 'male' });
      expect(call.url).to.equal('https://api.test/api/ai-assessment/predict');
      expect(call.init.headers.Authorization).to.equal('Bearer abc');
      expect(call.init.headers['X-Contract-Version']).to.equal('v1');
      expect(JSON.parse(call.init.body)).to.deep.equal({ contractVersion: 'v1', inputs: { sex: 'male' } });
      expect(result.ok).to.equal(true);
      expect(result.meta.contractVersion).to.equal('v1');
    });

    it('returns API errors without throwing', async () => {
      const client = contract.createAiAssessmentClient({
        baseUrl: 'https://api.test',
        fetch: async () => stubResponse(400, fixture('error-validation').body),
      });
      const result = await client.predict({});
      expect(result).to.include({ ok: false, status: 400, code: 'VALIDATION_ERROR' });
      expect(result.errors).to.have.length(2);
    });

    it('reports network failures and non-JSON bodies as typed errors', async () => {
      const down = contract.createAiAssessmentClient({ baseUrl: 'x', fetch: async () => { throw new Error('offline'); } });
      expect((await down.predict({})).code).to.equal('NETWORK_ERROR');
      const html = contract.createAiAssessmentClient({ baseUrl: 'x', fetch: async () => stubResponse(502) });
      expect((await html.predict({})).code).to.equal('BAD_RESPONSE');
    });

    it('times out slow requests', async () => {
      const client = contract.createAiAssessmentClient({
        baseUrl: 'x',
        timeoutMs: 20,
        fetch: (url, init) =>
          new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))),
      });
      expect((await client.predict({})).code).to.equal('CLIENT_TIMEOUT');
    });

    it('serves fixtures in mock mode without calling the network', async () => {
      const client = contract.createAiAssessmentClient({
        mock: 'fallback',
        mockDelayMs: 0,
        fetch: () => { throw new Error('should not be called'); },
      });
      const result = await client.predict({});
      expect(contract.toScreenState(result).state).to.equal('fallback');
      const errorClient = contract.createAiAssessmentClient({ mock: 'error', mockDelayMs: 0 });
      expect(contract.toScreenState(await errorClient.predict({})).state).to.equal('error');
    });
  });
});
