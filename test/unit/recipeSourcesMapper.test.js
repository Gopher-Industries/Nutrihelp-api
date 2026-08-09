/**
 * Unit tests for the recipe mapper. The LLM is injected as a stub — no network.
 */
const assert = require('assert');
const sinon = require('sinon');
const {
  TARGET_FIELDS,
  buildMapPrompt,
  deterministicMap,
  mapRecipe,
} = require('../../services/recipeSources/mapperService');

const SOURCE = {
  source: 'themealdb',
  external_id: '52771',
  title: 'Spicy Arrabiata Penne',
  category: 'Vegetarian',
  area: 'Italian',
  instructions:
    'Bring a large pot of salted water to a boil. Add the penne and cook until al dente. '
    + 'Heat the olive oil in a pan and saute the garlic until fragrant.',
  thumbnail: 'https://example.com/thumb.jpg',
  source_url: 'https://example.com/arrabiata',
  ingredients: [
    { name: 'penne rigate', measure: '1 pound' },
    { name: 'olive oil', measure: '1/4 cup' },
    { name: 'garlic', measure: '3 cloves' },
  ],
};

function goodLlmPayload() {
  return JSON.stringify({
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
      { name: 'garlic', quantity: 3, unit: 'piece', notes: 'cloves' },
    ],
    instructions: [
      'Bring a large pot of salted water to a boil',
      'Add the penne and cook until al dente',
      'Heat the olive oil in a pan and saute the garlic until fragrant',
    ],
  });
}

describe('buildMapPrompt', () => {
  it('embeds the source recipe and forbids invention', () => {
    const prompt = buildMapPrompt(SOURCE);

    assert.ok(prompt.includes('penne rigate'), 'source ingredients must be in the prompt');
    assert.ok(prompt.includes('Spicy Arrabiata Penne'));
    assert.ok(/never invent|do not invent/i.test(prompt), 'prompt must forbid invention');
    assert.ok(prompt.includes('null'), 'prompt must tell the model to use null for missing data');
  });
});

describe('deterministicMap', () => {
  it('maps source fields across without an LLM', () => {
    const draft = deterministicMap(SOURCE);

    assert.strictEqual(draft.recipe_name, 'Spicy Arrabiata Penne');
    assert.strictEqual(draft.cuisine_name, 'Italian');
    assert.strictEqual(draft.image_url, 'https://example.com/thumb.jpg');
    assert.strictEqual(draft.ingredients.length, 3);
    assert.strictEqual(draft.ingredients[0].name, 'penne rigate');
    assert.ok(draft.instructions.length >= 3, 'instructions should be split into steps');
  });

  it('leaves fields the source cannot supply as null', () => {
    const draft = deterministicMap(SOURCE);

    assert.strictEqual(draft.servings, null);
    assert.strictEqual(draft.prep_time_minutes, null);
    assert.strictEqual(draft.calories, null);
  });
});

describe('mapRecipe', () => {
  it('uses the LLM draft when it validates and passes fidelity', async () => {
    const generate = sinon.stub().resolves(goodLlmPayload());

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.mapper.strategy, 'llm');
    assert.strictEqual(result.draft.recipe_name, 'Spicy Arrabiata Penne');
    assert.strictEqual(result.draft.ingredients[1].quantity, 0.25);
    assert.strictEqual(generate.callCount, 1);
  });

  it('reports fields the source could not fill', async () => {
    const generate = sinon.stub().resolves(goodLlmPayload());

    const result = await mapRecipe(SOURCE, { generate });

    assert.ok(result.unmapped_fields.includes('calories'));
    assert.ok(result.unmapped_fields.includes('prep_time_minutes'));
    assert.ok(!result.unmapped_fields.includes('recipe_name'));
  });

  it('returns source attribution metadata', async () => {
    const generate = sinon.stub().resolves(goodLlmPayload());

    const result = await mapRecipe(SOURCE, { generate });

    assert.deepStrictEqual(result.source_meta, {
      source: 'themealdb',
      external_id: '52771',
      source_url: 'https://example.com/arrabiata',
      attribution: 'TheMealDB',
      license: 'Free with attribution',
    });
  });

  it('strips markdown fences before parsing', async () => {
    const generate = sinon.stub().resolves('```json\n' + goodLlmPayload() + '\n```');

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.mapper.strategy, 'llm');
  });

  it('retries once on unparseable output, then succeeds', async () => {
    const generate = sinon.stub();
    generate.onFirstCall().resolves('I am afraid I cannot do that.');
    generate.onSecondCall().resolves(goodLlmPayload());

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(generate.callCount, 2);
    assert.strictEqual(result.mapper.strategy, 'llm');
  });

  it('falls back to deterministic mapping when output stays unparseable', async () => {
    const generate = sinon.stub().resolves('still not json');

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(generate.callCount, 2);
    assert.strictEqual(result.mapper.strategy, 'fallback');
    assert.strictEqual(result.draft.recipe_name, 'Spicy Arrabiata Penne');
  });

  it('falls back when the model invents an ingredient', async () => {
    const invented = JSON.parse(goodLlmPayload());
    invented.ingredients.push({ name: 'white truffle', quantity: 10, unit: 'g', notes: null });
    const generate = sinon.stub().resolves(JSON.stringify(invented));

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.mapper.strategy, 'fallback');
    assert.ok(result.mapper.violations.some((v) => v.includes('white truffle')));
    assert.ok(
      !result.draft.ingredients.some((i) => i.name === 'white truffle'),
      'invented ingredient must not reach the draft'
    );
  });

  it('falls back when the model returns the wrong shape', async () => {
    const generate = sinon.stub().resolves(JSON.stringify({ recipe_name: 'x', ingredients: 'not-an-array' }));

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.mapper.strategy, 'fallback');
  });

  it('falls back when the LLM call throws', async () => {
    const generate = sinon.stub().rejects(new Error('provider down'));

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.mapper.strategy, 'fallback');
    assert.strictEqual(result.draft.recipe_name, 'Spicy Arrabiata Penne');
  });

  it('exposes every target field on the draft', async () => {
    const generate = sinon.stub().resolves(goodLlmPayload());

    const result = await mapRecipe(SOURCE, { generate });

    for (const field of TARGET_FIELDS) {
      assert.ok(field in result.draft, `draft is missing target field ${field}`);
    }
  });
});
