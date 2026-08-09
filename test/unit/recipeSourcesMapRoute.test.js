/**
 * Route-level tests for POST /api/recipe-sources/map.
 */
const assert = require('assert');
const express = require('express');
const sinon = require('sinon');
const request = require('supertest');
const proxyquire = require('proxyquire');

const SOURCE_RECIPE = {
  source: 'themealdb',
  external_id: '52771',
  title: 'Spicy Arrabiata Penne',
  area: 'Italian',
  instructions: 'Boil the penne until al dente.',
  thumbnail: 'https://example.com/thumb.jpg',
  source_url: 'https://example.com/arrabiata',
  ingredients: [{ name: 'penne rigate', measure: '1 pound' }],
};

const MAP_RESULT = {
  draft: { recipe_name: 'Spicy Arrabiata Penne', ingredients: [], instructions: [] },
  unmapped_fields: ['calories'],
  source_meta: { source: 'themealdb', external_id: '52771' },
  mapper: { strategy: 'llm', model: 'gemini-flash-latest', violations: [] },
};

function buildApp({ getAdapter, mapRecipe }) {
  const controller = proxyquire('../../controller/recipeSourcesController', {
    '../services/recipeSources': {
      getAdapter,
      searchAll: sinon.stub().resolves([]),
      listSources: () => ['themealdb'],
    },
    '../services/recipeSources/mapperService': { mapRecipe },
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

describe('POST /api/recipe-sources/map', () => {
  it('looks the recipe up server-side and returns the mapped draft', async () => {
    const lookup = sinon.stub().resolves(SOURCE_RECIPE);
    const mapRecipe = sinon.stub().resolves(MAP_RESULT);
    const app = buildApp({ getAdapter: () => ({ lookup }), mapRecipe });

    const response = await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'themealdb', external_id: '52771' })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.deepStrictEqual(response.body.data, MAP_RESULT);
    assert.ok(lookup.calledOnceWith('52771'));
    assert.deepStrictEqual(mapRecipe.firstCall.args[0], SOURCE_RECIPE);
  });

  it('ignores any recipe content supplied by the client', async () => {
    const lookup = sinon.stub().resolves(SOURCE_RECIPE);
    const mapRecipe = sinon.stub().resolves(MAP_RESULT);
    const app = buildApp({ getAdapter: () => ({ lookup }), mapRecipe });

    await request(app)
      .post('/api/recipe-sources/map')
      .send({
        source: 'themealdb',
        external_id: '52771',
        instructions: 'Add arsenic and stir',
        ingredients: [{ name: 'arsenic' }],
      })
      .expect(200);

    assert.deepStrictEqual(mapRecipe.firstCall.args[0], SOURCE_RECIPE);
  });

  it('returns 400 when external_id is missing', async () => {
    const app = buildApp({ getAdapter: () => ({ lookup: sinon.stub() }), mapRecipe: sinon.stub() });

    await request(app).post('/api/recipe-sources/map').send({ source: 'themealdb' }).expect(400);
  });

  it('returns 400 for an unknown source', async () => {
    const app = buildApp({ getAdapter: () => null, mapRecipe: sinon.stub() });

    const response = await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'notarealsource', external_id: '1' })
      .expect(400);

    assert.strictEqual(response.body.success, false);
  });

  it('returns 404 when the source has no recipe with that id', async () => {
    const app = buildApp({
      getAdapter: () => ({ lookup: sinon.stub().resolves(null) }),
      mapRecipe: sinon.stub(),
    });

    await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'themealdb', external_id: '999999' })
      .expect(404);
  });

  it('returns 502 when the source lookup throws', async () => {
    const app = buildApp({
      getAdapter: () => ({ lookup: sinon.stub().rejects(new Error('timeout')) }),
      mapRecipe: sinon.stub(),
    });

    await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'themealdb', external_id: '52771' })
      .expect(502);
  });
});
