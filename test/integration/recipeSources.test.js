/**
 * Integration: search -> map happy path.
 *
 * Real router + controller + registry + adapter + mapper. Only the two external
 * boundaries are faked: TheMealDB HTTP and the LLM.
 */
const assert = require('assert');
const express = require('express');
const sinon = require('sinon');
const request = require('supertest');
const proxyquire = require('proxyquire');

function mealFixture() {
  const meal = {
    idMeal: '52771',
    strMeal: 'Spicy Arrabiata Penne',
    strArea: 'Italian',
    strCategory: 'Vegetarian',
    strMealThumb: 'https://example.com/thumb.jpg',
    strInstructions:
      'Bring a large pot of salted water to a boil. Add the penne and cook until al dente. '
      + 'Heat the olive oil in a pan and saute the garlic until fragrant.',
    strSource: 'https://example.com/arrabiata',
    strIngredient1: 'penne rigate',
    strMeasure1: '1 pound',
    strIngredient2: 'olive oil',
    strMeasure2: '1/4 cup',
    strIngredient3: 'garlic',
    strMeasure3: '3 cloves',
  };
  for (let i = 4; i <= 20; i += 1) {
    meal[`strIngredient${i}`] = '';
    meal[`strMeasure${i}`] = '';
  }
  return meal;
}

const LLM_RESPONSE = JSON.stringify({
  recipe_name: 'Spicy Arrabiata Penne',
  description: null,
  cuisine_name: 'Italian',
  cooking_method_name: null,
  meal_type: null,
  servings: null,
  prep_time_minutes: null,
  cook_time_minutes: null,
  difficulty: null,
  image_url: 'https://example.com/thumb.jpg',
  ingredients: [
    { name: 'penne rigate', quantity: 1, unit: 'pound', notes: null },
    { name: 'olive oil', quantity: 0.25, unit: 'cup', notes: null },
    { name: 'garlic', quantity: 3, unit: 'cloves', notes: null },
  ],
  instructions: [
    'Bring a large pot of salted water to a boil',
    'Add the penne and cook until al dente',
    'Heat the olive oil in a pan and saute the garlic until fragrant',
  ],
});

function buildApp(axiosGet, generate) {
  const theMealDb = proxyquire('../../services/recipeSources/adapters/theMealDb', {
    axios: { get: axiosGet },
  });
  const registry = proxyquire('../../services/recipeSources', {
    './adapters/theMealDb': theMealDb,
  });
  // axios stubbed out: the mapper fetches the source thumbnail server-side, and
  // unstubbed that is a real outbound request on every mapped recipe.
  const mapperService = proxyquire('../../services/recipeSources/mapperService', {
    axios: { get: sinon.stub().rejects(new Error('image fetch stubbed')) },
  });
  const controller = proxyquire('../../controller/recipeSourcesController', {
    '../services/recipeSources': registry,
    '../services/recipeSources/mapperService': {
      ...mapperService,
      mapRecipe: (sourceRecipe) => mapperService.mapRecipe(sourceRecipe, { generate }),
    },
    // The resolver talks to Supabase with the service role. Other always-loaded
    // suites call dotenv.config() at module scope, so leaving it unstubbed makes
    // this test read and write the team's SHARED ingredients table. Resolution
    // is not what this test is about — stub it out entirely.
    '../services/recipeSources/ingredientResolver': {
      resolveIngredients: sinon.stub().resolves([]),
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

describe('integration: recipe sources search -> map', () => {
  it('searches, then maps the selected recipe into a faithful draft', async () => {
    const axiosGet = sinon.stub().resolves({ data: { meals: [mealFixture()] } });
    const generate = sinon.stub().resolves(LLM_RESPONSE);
    const app = buildApp(axiosGet, generate);

    const searchResponse = await request(app)
      .get('/api/recipe-sources/search?q=arrabiata')
      .expect(200);

    const [firstResult] = searchResponse.body.data.results;
    assert.strictEqual(firstResult.title, 'Spicy Arrabiata Penne');
    assert.strictEqual(firstResult.source, 'themealdb');

    const mapResponse = await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: firstResult.source, external_id: firstResult.external_id })
      .expect(200);

    const { draft, unmapped_fields: unmapped, source_meta: sourceMeta, mapper } = mapResponse.body.data;

    assert.strictEqual(mapper.strategy, 'llm');
    assert.strictEqual(draft.recipe_name, 'Spicy Arrabiata Penne');
    assert.strictEqual(draft.cuisine_name, 'Italian');
    assert.strictEqual(draft.ingredients.length, 3);
    assert.strictEqual(draft.instructions.length, 3);

    // Nutrition is absent from TheMealDB and must be reported, never fabricated.
    assert.strictEqual(draft.calories, null);
    assert.ok(unmapped.includes('calories'));
    assert.ok(unmapped.includes('protein'));

    assert.strictEqual(sourceMeta.attribution, 'TheMealDB');
    assert.strictEqual(sourceMeta.external_id, '52771');
  });

  it('still returns a usable draft when the LLM misbehaves', async () => {
    const axiosGet = sinon.stub().resolves({ data: { meals: [mealFixture()] } });
    const generate = sinon.stub().resolves('the model went off-script');
    const app = buildApp(axiosGet, generate);

    const response = await request(app)
      .post('/api/recipe-sources/map')
      .send({ source: 'themealdb', external_id: '52771' })
      .expect(200);

    assert.strictEqual(response.body.data.mapper.strategy, 'fallback');
    assert.strictEqual(response.body.data.draft.recipe_name, 'Spicy Arrabiata Penne');
    assert.strictEqual(response.body.data.draft.ingredients.length, 3);
  });
});
