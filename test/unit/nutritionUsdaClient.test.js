/**
 * Unit tests for the USDA FoodData Central HTTP client.
 * axios is replaced with a sinon stub via proxyquire. No real HTTP, no API key.
 */
const assert = require('assert');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const SILENT_LOGGER = { info() {}, warn() {}, error() {}, debug() {} };

function loadClient(axiosGet) {
  return proxyquire('../../services/nutritionSources/usdaClient', {
    axios: { get: axiosGet },
    '../../utils/logger': SILENT_LOGGER,
  });
}

function httpError(status) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status };
  return error;
}

const GARLIC_ROW = {
  fdcId: 169230,
  description: 'Garlic, raw',
  dataType: 'SR Legacy',
  score: 812.4,
  publishedDate: '2019-04-01',
  foodNutrients: [{ nutrientId: 1008, value: 149, unitName: 'KCAL' }],
};

describe('nutritionSources/usdaClient', () => {
  let savedKey;

  beforeEach(() => {
    savedKey = process.env.USDA_API_KEY;
    delete process.env.USDA_API_KEY;
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env.USDA_API_KEY;
    else process.env.USDA_API_KEY = savedKey;
  });

  describe('searchFoods', () => {
    it('asks for generic foods only and sends the key in a header, not the URL', async () => {
      process.env.USDA_API_KEY = 'real-key';
      const axiosGet = sinon.stub().resolves({ data: { foods: [GARLIC_ROW] } });

      await loadClient(axiosGet).searchFoods('garlic');

      const [url, config] = axiosGet.firstCall.args;
      assert.strictEqual(url, 'https://api.nal.usda.gov/fdc/v1/foods/search');
      assert.strictEqual(config.params.query, 'garlic');
      assert.strictEqual(config.params.dataType, 'SR Legacy,Foundation');
      assert.strictEqual(config.headers['X-Api-Key'], 'real-key');
      assert.ok(!('api_key' in config.params), 'the key must not travel in the query string');
      assert.ok(config.timeout > 0);
    });

    it('asks for enough candidates to get past the weak relevance order', async () => {
      // With 8, "water" returned a vegetable and never the drink.
      const axiosGet = sinon.stub().resolves({ data: { foods: [] } });

      await loadClient(axiosGet).searchFoods('water');

      assert.strictEqual(axiosGet.firstCall.args[1].params.pageSize, 25);
    });

    it('falls back to the public demo key when none is configured', async () => {
      const axiosGet = sinon.stub().resolves({ data: { foods: [] } });

      await loadClient(axiosGet).searchFoods('garlic');

      assert.strictEqual(axiosGet.firstCall.args[1].headers['X-Api-Key'], 'DEMO_KEY');
    });

    it('returns candidates trimmed to the fields the matcher needs', async () => {
      const axiosGet = sinon.stub().resolves({ data: { foods: [GARLIC_ROW] } });

      const foods = await loadClient(axiosGet).searchFoods('garlic');

      assert.deepStrictEqual(foods, [
        {
          fdcId: 169230,
          description: 'Garlic, raw',
          dataType: 'SR Legacy',
          foodNutrients: GARLIC_ROW.foodNutrients,
        },
      ]);
    });

    it('returns an empty list when USDA has no match', async () => {
      const axiosGet = sinon.stub().resolves({ data: { totalHits: 0 } });

      assert.deepStrictEqual(await loadClient(axiosGet).searchFoods('zzzz'), []);
    });

    it('does not call USDA for a blank query', async () => {
      const axiosGet = sinon.stub();

      assert.deepStrictEqual(await loadClient(axiosGet).searchFoods('   '), []);
      assert.strictEqual(axiosGet.callCount, 0);
    });

    it('reports rate limiting with its own error code', async () => {
      const axiosGet = sinon.stub().rejects(httpError(429));

      await assert.rejects(loadClient(axiosGet).searchFoods('garlic'), (error) => {
        assert.strictEqual(error.code, 'rate_limited');
        return true;
      });
    });

    it('reports a network failure as unavailable', async () => {
      const axiosGet = sinon.stub().rejects(new Error('timeout of 5000ms exceeded'));

      await assert.rejects(loadClient(axiosGet).searchFoods('garlic'), (error) => {
        assert.strictEqual(error.code, 'unavailable');
        return true;
      });
    });
  });

  describe('getFood', () => {
    it('returns the nutrients and portion weights of one food', async () => {
      const detail = {
        fdcId: 169230,
        description: 'Garlic, raw',
        dataType: 'SR Legacy',
        foodNutrients: [{ nutrient: { id: 1008, unitName: 'kcal' }, amount: 149 }],
        foodPortions: [{ amount: 1, modifier: 'clove', gramWeight: 3 }],
        foodAttributes: [{ id: 1 }],
      };
      const axiosGet = sinon.stub().resolves({ data: detail });

      const food = await loadClient(axiosGet).getFood(169230);

      assert.strictEqual(axiosGet.firstCall.args[0], 'https://api.nal.usda.gov/fdc/v1/food/169230');
      assert.deepStrictEqual(food, {
        fdcId: 169230,
        description: 'Garlic, raw',
        dataType: 'SR Legacy',
        foodNutrients: detail.foodNutrients,
        foodPortions: detail.foodPortions,
      });
    });

    it('returns null when USDA no longer has the food', async () => {
      const axiosGet = sinon.stub().rejects(httpError(404));

      assert.strictEqual(await loadClient(axiosGet).getFood(1), null);
    });

    it('rejects an id that is not a positive integer without calling USDA', async () => {
      const axiosGet = sinon.stub();

      assert.strictEqual(await loadClient(axiosGet).getFood('1; drop'), null);
      assert.strictEqual(axiosGet.callCount, 0);
    });
  });
});
