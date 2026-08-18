/**
 * Unit tests for the TheMealDB source adapter.
 * axios is replaced with a sinon stub via proxyquire — no real HTTP.
 */
const assert = require('assert');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

function loadAdapter(axiosStub) {
  return proxyquire('../../services/recipeSources/adapters/theMealDb', {
    axios: { get: axiosStub },
  });
}

function mealFixture(overrides = {}) {
  const meal = {
    idMeal: '52771',
    strMeal: 'Spicy Arrabiata Penne',
    strArea: 'Italian',
    strCategory: 'Vegetarian',
    strMealThumb: 'https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg',
    strInstructions: 'Bring a large pot of water to a boil. Add penne and cook.',
    strSource: 'https://example.com/arrabiata',
    strIngredient1: 'penne rigate',
    strMeasure1: '1 pound',
    strIngredient2: 'olive oil',
    strMeasure2: '1/4 cup',
    strIngredient3: '',
    strMeasure3: '',
    ...overrides,
  };
  for (let i = 4; i <= 20; i += 1) {
    meal[`strIngredient${i}`] = '';
    meal[`strMeasure${i}`] = '';
  }
  return meal;
}

describe('theMealDb adapter — search', () => {
  it('maps meals to neutral typeahead rows', async () => {
    const axiosGet = sinon.stub().resolves({ data: { meals: [mealFixture()] } });
    const adapter = loadAdapter(axiosGet);

    const results = await adapter.search('arrabiata');

    assert.strictEqual(results.length, 1);
    assert.deepStrictEqual(results[0], {
      source: 'themealdb',
      external_id: '52771',
      title: 'Spicy Arrabiata Penne',
      thumbnail: 'https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg',
      cuisine: 'Italian',
      category: 'Vegetarian',
    });
  });

  it('returns an empty array when the source reports no matches', async () => {
    const axiosGet = sinon.stub().resolves({ data: { meals: null } });
    const adapter = loadAdapter(axiosGet);

    assert.deepStrictEqual(await adapter.search('zzzznotathing'), []);
  });

  it('sends the query to search.php with a timeout', async () => {
    const axiosGet = sinon.stub().resolves({ data: { meals: [] } });
    const adapter = loadAdapter(axiosGet);

    await adapter.search('penne');

    const [url, options] = axiosGet.firstCall.args;
    assert.ok(url.includes('search.php'), `expected search.php in ${url}`);
    assert.strictEqual(options.params.s, 'penne');
    assert.strictEqual(options.timeout, 5000);
  });
});

describe('theMealDb adapter — lookup', () => {
  it('collapses the 20 ingredient slots into a list, dropping empties', async () => {
    const axiosGet = sinon.stub().resolves({ data: { meals: [mealFixture()] } });
    const adapter = loadAdapter(axiosGet);

    const recipe = await adapter.lookup('52771');

    assert.deepStrictEqual(recipe.ingredients, [
      { name: 'penne rigate', measure: '1 pound' },
      { name: 'olive oil', measure: '1/4 cup' },
    ]);
    assert.strictEqual(recipe.external_id, '52771');
    assert.strictEqual(recipe.source, 'themealdb');
    assert.strictEqual(recipe.area, 'Italian');
    assert.strictEqual(recipe.instructions, 'Bring a large pot of water to a boil. Add penne and cook.');
  });

  it('treats whitespace-only ingredient slots as empty', async () => {
    const axiosGet = sinon.stub().resolves({
      data: { meals: [mealFixture({ strIngredient2: '   ', strMeasure2: '   ' })] },
    });
    const adapter = loadAdapter(axiosGet);

    const recipe = await adapter.lookup('52771');

    assert.deepStrictEqual(recipe.ingredients, [{ name: 'penne rigate', measure: '1 pound' }]);
  });

  it('returns null when the id is unknown', async () => {
    const axiosGet = sinon.stub().resolves({ data: { meals: null } });
    const adapter = loadAdapter(axiosGet);

    assert.strictEqual(await adapter.lookup('999999'), null);
  });
});
