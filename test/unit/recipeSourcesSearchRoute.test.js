/**
 * Route-level tests for GET /api/recipe-sources/search.
 * The registry is stubbed via proxyquire; auth middleware is bypassed with a fake user.
 */
const assert = require('assert');
const express = require('express');
const sinon = require('sinon');
const request = require('supertest');
const proxyquire = require('proxyquire');

function buildApp({ searchAll }) {
  const controller = proxyquire('../../controller/recipeSourcesController', {
    '../services/recipeSources': { searchAll, listSources: () => ['themealdb'] },
  });
  const router = proxyquire('../../routes/recipeSources', {
    '../controller/recipeSourcesController': controller,
    '../middleware/authenticateToken': {
      authenticateToken: (req, _res, next) => {
        req.user = { userId: 960, role: 'user' };
        next();
      },
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/recipe-sources', router);
  return app;
}

const SAMPLE_ROW = {
  source: 'themealdb',
  external_id: '52771',
  title: 'Spicy Arrabiata Penne',
  thumbnail: 'https://example.com/thumb.jpg',
  cuisine: 'Italian',
  category: 'Vegetarian',
};

describe('GET /api/recipe-sources/search', () => {
  it('returns adapter results under data.results', async () => {
    const app = buildApp({ searchAll: sinon.stub().resolves([SAMPLE_ROW]) });

    const response = await request(app).get('/api/recipe-sources/search?q=arrabiata').expect(200);

    assert.strictEqual(response.body.success, true);
    assert.deepStrictEqual(response.body.data.results, [SAMPLE_ROW]);
  });

  it('rejects a query shorter than 3 characters with 400', async () => {
    const searchAll = sinon.stub().resolves([]);
    const app = buildApp({ searchAll });

    const response = await request(app).get('/api/recipe-sources/search?q=ab').expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(searchAll.called, false, 'adapter must not be called for an invalid query');
  });

  it('rejects a missing query with 400', async () => {
    const app = buildApp({ searchAll: sinon.stub().resolves([]) });

    await request(app).get('/api/recipe-sources/search').expect(400);
  });

  it('returns 502 when the registry throws', async () => {
    const app = buildApp({ searchAll: sinon.stub().rejects(new Error('upstream exploded')) });

    const response = await request(app).get('/api/recipe-sources/search?q=arrabiata').expect(502);

    assert.strictEqual(response.body.success, false);
  });
});
