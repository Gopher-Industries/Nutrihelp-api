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

// A factory, not a shared constant: the controller mutates the object it gets
// back from mapRecipe (it rewrites draft.ingredients and attaches
// ingredient_resolution), so a module-level literal would make
// `deepStrictEqual(response.body.data, MAP_RESULT)` compare the result against
// itself and pass no matter what the controller produced.
function mapResult() {
  return {
    draft: {
      recipe_name: 'Spicy Arrabiata Penne',
      ingredients: [{ name: 'penne rigate', category: 'Pantry' }],
      instructions: [],
    },
    unmapped_fields: ['calories'],
    source_meta: { source: 'themealdb', external_id: '52771' },
    mapper: { strategy: 'llm', model: 'gemini-flash-latest', violations: [] },
  };
}

function buildApp({ getAdapter, mapRecipe, resolveIngredients }) {
  const controller = proxyquire('../../controller/recipeSourcesController', {
    '../services/recipeSources': {
      getAdapter,
      searchAll: sinon.stub().resolves([]),
      listSources: () => ['themealdb'],
    },
    '../services/recipeSources/mapperService': { mapRecipe },
    // Always stubbed: the real resolver holds a service-role Supabase client and
    // would read (and, before this was split, write) the shared ingredients
    // table during a test run.
    '../services/recipeSources/ingredientResolver': {
      resolveIngredients: resolveIngredients || sinon.stub().resolves([]),
    },
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
    const mapRecipe = sinon.stub().resolves(mapResult());
    const app = buildApp({ getAdapter: () => ({ lookup }), mapRecipe });

    const response = await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'themealdb', external_id: '52771' })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.draft.recipe_name, 'Spicy Arrabiata Penne');
    assert.deepStrictEqual(response.body.data.unmapped_fields, ['calories']);
    assert.strictEqual(response.body.data.mapper.strategy, 'llm');
    assert.ok(lookup.calledOnceWith('52771'));
    assert.deepStrictEqual(mapRecipe.firstCall.args[0], SOURCE_RECIPE);
  });

  it('resolves ingredients read-only — previewing never creates rows', async () => {
    const lookup = sinon.stub().resolves(SOURCE_RECIPE);
    const mapRecipe = sinon.stub().resolves(mapResult());
    const resolveIngredients = sinon.stub().resolves([
      { name: 'penne rigate', id: null, category: null, status: 'unmatched' },
    ]);
    const app = buildApp({ getAdapter: () => ({ lookup }), mapRecipe, resolveIngredients });

    const response = await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'themealdb', external_id: '52771' })
      .expect(200);

    // The whole point of the split: /map must ask for matching only.
    assert.deepStrictEqual(resolveIngredients.firstCall.args[1], { createMissing: false });
    assert.deepStrictEqual(response.body.data.ingredient_resolution, {
      matched: 0,
      unmatched: 1,
      failed: 0,
    });
  });

  it('keeps the mapper category for an unmatched ingredient', async () => {
    const lookup = sinon.stub().resolves(SOURCE_RECIPE);
    const mapRecipe = sinon.stub().resolves(mapResult());
    const resolveIngredients = sinon.stub().resolves([
      { name: 'penne rigate', id: null, category: null, status: 'unmatched' },
    ]);
    const app = buildApp({ getAdapter: () => ({ lookup }), mapRecipe, resolveIngredients });

    const response = await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'themealdb', external_id: '52771' })
      .expect(200);

    const [ingredient] = response.body.data.draft.ingredients;
    assert.strictEqual(ingredient.category, 'Pantry');
    assert.strictEqual(ingredient.ingredient_id, null);
    assert.strictEqual(ingredient.resolution, 'unmatched');
  });

  it('reports the matched name and id when an ingredient already exists', async () => {
    const lookup = sinon.stub().resolves(SOURCE_RECIPE);
    const mapRecipe = sinon.stub().resolves(mapResult());
    const resolveIngredients = sinon.stub().resolves([
      { name: 'penne rigate', id: 42, category: 'Bakery', status: 'matched', matchedName: 'Penne' },
    ]);
    const app = buildApp({ getAdapter: () => ({ lookup }), mapRecipe, resolveIngredients });

    const response = await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'themealdb', external_id: '52771' })
      .expect(200);

    const [ingredient] = response.body.data.draft.ingredients;
    assert.strictEqual(ingredient.ingredient_id, 42);
    assert.strictEqual(ingredient.matched_name, 'Penne');
    assert.strictEqual(response.body.data.ingredient_resolution.matched, 1);
  });

  it('still returns the draft when resolution blows up', async () => {
    const lookup = sinon.stub().resolves(SOURCE_RECIPE);
    const mapRecipe = sinon.stub().resolves(mapResult());
    const resolveIngredients = sinon.stub().rejects(new Error('supabase down'));
    const app = buildApp({ getAdapter: () => ({ lookup }), mapRecipe, resolveIngredients });

    const response = await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'themealdb', external_id: '52771' })
      .expect(200);

    assert.strictEqual(response.body.data.draft.recipe_name, 'Spicy Arrabiata Penne');
    assert.strictEqual(response.body.data.ingredient_resolution, undefined);
  });

  it('ignores any recipe content supplied by the client', async () => {
    const lookup = sinon.stub().resolves(SOURCE_RECIPE);
    const mapRecipe = sinon.stub().resolves(mapResult());
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

describe('POST /api/recipe-sources/resolve-ingredients', () => {
  function buildResolveApp(resolveIngredients) {
    return buildApp({
      getAdapter: () => null,
      mapRecipe: sinon.stub(),
      resolveIngredients,
    });
  }

  it('creates missing ingredients and returns the resolution', async () => {
    const resolveIngredients = sinon.stub().resolves([
      { name: 'garlic', id: 7, category: 'Fruit & Vegetables', status: 'matched', matchedName: 'Garlic' },
      { name: 'penne rigate', id: 501, category: 'Pantry', status: 'created' },
    ]);
    const app = buildResolveApp(resolveIngredients);

    const response = await request(app)
      .post('/api/recipe-sources/resolve-ingredients')
      .send({
        ingredients: [
          { name: 'garlic', category: 'Fruit & Vegetables' },
          { name: 'penne rigate', category: 'Pantry' },
        ],
      })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.resolved.length, 2);
    assert.strictEqual(response.body.data.resolved[1].id, 501);
    // This is the one endpoint allowed to write.
    assert.deepStrictEqual(resolveIngredients.firstCall.args[1], { createMissing: true });
  });

  it('accepts an ingredient without a category', async () => {
    const resolveIngredients = sinon.stub().resolves([
      { name: 'garlic', id: 7, category: 'Fruit & Vegetables', status: 'matched' },
    ]);
    const app = buildResolveApp(resolveIngredients);

    await request(app)
      .post('/api/recipe-sources/resolve-ingredients')
      .send({ ingredients: [{ name: 'garlic' }] })
      .expect(200);
  });

  it('rejects more than 30 ingredients', async () => {
    const resolveIngredients = sinon.stub().resolves([]);
    const app = buildResolveApp(resolveIngredients);

    const ingredients = Array.from({ length: 31 }, (_v, i) => ({ name: `ingredient ${i}` }));

    const response = await request(app)
      .post('/api/recipe-sources/resolve-ingredients')
      .send({ ingredients })
      .expect(400);

    assert.strictEqual(response.body.success, false);
    // Nothing may reach the resolver — the cap exists to bound writes.
    assert.strictEqual(resolveIngredients.called, false);
  });

  it('rejects an empty ingredient name', async () => {
    const resolveIngredients = sinon.stub().resolves([]);
    const app = buildResolveApp(resolveIngredients);

    await request(app)
      .post('/api/recipe-sources/resolve-ingredients')
      .send({ ingredients: [{ name: '   ' }] })
      .expect(400);

    assert.strictEqual(resolveIngredients.called, false);
  });

  it('rejects a missing ingredients array', async () => {
    const app = buildResolveApp(sinon.stub().resolves([]));

    await request(app).post('/api/recipe-sources/resolve-ingredients').send({}).expect(400);
  });

  it('returns 500 when resolution throws', async () => {
    const app = buildResolveApp(sinon.stub().rejects(new Error('supabase down')));

    await request(app)
      .post('/api/recipe-sources/resolve-ingredients')
      .send({ ingredients: [{ name: 'garlic' }] })
      .expect(500);
  });
});
