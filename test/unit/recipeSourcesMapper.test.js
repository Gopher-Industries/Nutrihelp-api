/**
 * Unit tests for the recipe mapper. The LLM is injected as a stub and axios is
 * proxyquired out — no network. (Without the axios stub the source-image fetch
 * really does reach out to the thumbnail host on every mapRecipe call.)
 */
const assert = require('assert');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Shared default: image fetches fail, which mapRecipe treats as "no image".
const axiosStub = { get: sinon.stub().rejects(new Error('image fetch stubbed')) };

const {
  TARGET_FIELDS,
  LLM_TIMEOUT_MS,
  withTimeout,
  buildMapPrompt,
  deterministicMap,
  mapRecipe,
} = proxyquire('../../services/recipeSources/mapperService', { axios: axiosStub });

/** Loads a fresh mapper whose axios.get is the supplied stub. */
function loadMapperWithAxios(get) {
  return proxyquire('../../services/recipeSources/mapperService', { axios: { get } });
}

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

  it('falls back when the LLM call throws on every attempt', async () => {
    const generate = sinon.stub().rejects(new Error('provider down'));

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(generate.callCount, 2, 'a provider error should be retried');
    assert.strictEqual(result.mapper.strategy, 'fallback');
    assert.strictEqual(result.draft.recipe_name, 'Spicy Arrabiata Penne');
    assert.ok(result.mapper.violations.some((v) => v.includes('provider error')));
  });

  it('retries a transient provider error and succeeds on the second attempt', async () => {
    const generate = sinon.stub();
    generate.onFirstCall().rejects(new Error('[503 Service Unavailable] high demand'));
    generate.onSecondCall().resolves(goodLlmPayload());

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(generate.callCount, 2);
    assert.strictEqual(result.mapper.strategy, 'llm');
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

describe('controlled vocabularies', () => {
  function payloadWith(overrides) {
    return JSON.stringify({ ...JSON.parse(goodLlmPayload()), ...overrides });
  }

  it('keeps a cooking method that is on the list', async () => {
    const generate = sinon.stub().resolves(payloadWith({ cooking_method_name: 'Boil' }));

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.draft.cooking_method_name, 'Boil');
    assert.ok(!result.unmapped_fields.includes('cooking_method_name'));
  });

  it('nulls out an off-list cooking method and reports it as unmapped', async () => {
    const generate = sinon.stub().resolves(payloadWith({ cooking_method_name: 'Sous Vide' }));

    const result = await mapRecipe(SOURCE, { generate });

    // Previously copied through verbatim: rendered as a blank select, dropped
    // at save, and never flagged.
    assert.strictEqual(result.draft.cooking_method_name, null);
    assert.ok(result.unmapped_fields.includes('cooking_method_name'));
  });

  it('restores the canonical casing of a cooking method', async () => {
    const generate = sinon.stub().resolves(payloadWith({ cooking_method_name: 'stir-frying' }));

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.draft.cooking_method_name, 'Stir-Frying');
  });

  it('keeps a cuisine that is on the list', async () => {
    const generate = sinon.stub().resolves(payloadWith({ cuisine_name: 'Italian' }));

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.draft.cuisine_name, 'Italian');
    assert.ok(!result.unmapped_fields.includes('cuisine_name'));
  });

  it('nulls out an off-list cuisine and reports it as unmapped', async () => {
    const generate = sinon.stub().resolves(payloadWith({ cuisine_name: 'Canadian' }));

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.draft.cuisine_name, null);
    assert.ok(result.unmapped_fields.includes('cuisine_name'));
  });

  it('restores the canonical casing of a cuisine', async () => {
    const generate = sinon.stub().resolves(payloadWith({ cuisine_name: 'MEDITERRANEAN' }));

    const result = await mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.draft.cuisine_name, 'Mediterranean');
  });

  it('gates the cuisine on the deterministic fallback path too', async () => {
    const generate = sinon.stub().resolves('the model went off-script');

    const result = await mapRecipe({ ...SOURCE, area: 'Canadian' }, { generate });

    assert.strictEqual(result.mapper.strategy, 'fallback');
    assert.strictEqual(result.draft.cuisine_name, null);
    assert.ok(result.unmapped_fields.includes('cuisine_name'));
  });
});

describe('withTimeout', () => {
  it('resolves with the promise value when it settles in time', async () => {
    assert.strictEqual(await withTimeout(Promise.resolve('ok'), 1000, 'task'), 'ok');
  });

  it('rejects once the deadline passes', async () => {
    await assert.rejects(
      withTimeout(new Promise(() => {}), 10, 'task'),
      /task timed out after 10ms/
    );
  });

  it('clears its timer so a settled call leaves nothing pending', async () => {
    const clock = sinon.useFakeTimers();
    try {
      await withTimeout(Promise.resolve('ok'), 45000, 'task');
      assert.strictEqual(clock.countTimers(), 0);
    } finally {
      clock.restore();
    }
  });
});

describe('gemini provider timeout', () => {
  it('bounds an unbounded generateContent call at LLM_TIMEOUT_MS', async () => {
    const clock = sinon.useFakeTimers();
    try {
      // Gemini's SDK takes no timeout option, so a hung call would otherwise
      // never return. Gemini is the default whenever OPENROUTER_API_KEY is
      // unset, so this is the common path, not an edge case.
      const mapper = proxyquire('../../services/recipeSources/mapperService', {
        axios: axiosStub,
        '@google/generative-ai': {
          GoogleGenerativeAI: class {
            getGenerativeModel() {
              return { generateContent: () => new Promise(() => {}) };
            }
          },
        },
      });

      const originalKey = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      let generate;
      try {
        generate = mapper.resolveProvider().generate;
      } finally {
        if (originalKey !== undefined) process.env.OPENROUTER_API_KEY = originalKey;
      }

      const pending = generate('prompt');
      const assertion = assert.rejects(pending, /gemini generateContent timed out/);
      await clock.tickAsync(LLM_TIMEOUT_MS + 1);
      await assertion;
    } finally {
      clock.restore();
    }
  });
});

describe('mapRecipe — source image fetch', () => {
  const PNG = {
    headers: { 'content-type': 'image/png' },
    data: Buffer.from('not really a png'),
  };

  /** A payload whose image_url points somewhere the model chose. */
  function hostileImagePayload() {
    const payload = JSON.parse(goodLlmPayload());
    payload.image_url = 'http://169.254.169.254/latest/meta-data/';
    return JSON.stringify(payload);
  }

  it('fetches the adapter-supplied thumbnail, never the model-supplied url', async () => {
    const get = sinon.stub().resolves(PNG);
    const mapper = loadMapperWithAxios(get);
    const generate = sinon.stub().resolves(hostileImagePayload());

    const result = await mapper.mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.mapper.strategy, 'llm');
    assert.strictEqual(get.callCount, 1);
    assert.strictEqual(get.firstCall.args[0], SOURCE.thumbnail);
    assert.ok(result.source_image.startsWith('data:image/png;base64,'));
  });

  it('refuses redirects on the image fetch', async () => {
    const get = sinon.stub().resolves(PNG);
    const mapper = loadMapperWithAxios(get);
    const generate = sinon.stub().resolves(goodLlmPayload());

    await mapper.mapRecipe(SOURCE, { generate });

    // A permitted host must not be able to bounce the request onto another one.
    assert.strictEqual(get.firstCall.args[1].maxRedirects, 0);
  });

  it('caps the image at 1 MB', async () => {
    const get = sinon.stub().resolves(PNG);
    const mapper = loadMapperWithAxios(get);
    const generate = sinon.stub().resolves(goodLlmPayload());

    await mapper.mapRecipe(SOURCE, { generate });

    const options = get.firstCall.args[1];
    assert.strictEqual(options.maxContentLength, 1024 * 1024);
    assert.strictEqual(options.maxBodyLength, 1024 * 1024);
  });

  it('uses the adapter thumbnail on the deterministic fallback path too', async () => {
    const get = sinon.stub().resolves(PNG);
    const mapper = loadMapperWithAxios(get);
    const generate = sinon.stub().resolves('the model went off-script');

    const result = await mapper.mapRecipe(SOURCE, { generate });

    // NOTE: not a discriminating assertion on its own — the deterministic draft
    // copies image_url straight from the thumbnail, so both spellings of the
    // call produce the same url here. It guards against the two paths drifting.
    assert.strictEqual(result.mapper.strategy, 'fallback');
    assert.strictEqual(get.firstCall.args[0], SOURCE.thumbnail);
    assert.strictEqual(get.firstCall.args[1].maxRedirects, 0);
  });

  it('rejects an image whose content type is not an allowed image', async () => {
    const get = sinon.stub().resolves({
      headers: { 'content-type': 'text/html' },
      data: Buffer.from('<html>internal page</html>'),
    });
    const mapper = loadMapperWithAxios(get);
    const generate = sinon.stub().resolves(goodLlmPayload());

    const result = await mapper.mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.source_image, null);
  });

  it('returns a draft with no image rather than failing when the fetch throws', async () => {
    const get = sinon.stub().rejects(new Error('ECONNREFUSED'));
    const mapper = loadMapperWithAxios(get);
    const generate = sinon.stub().resolves(goodLlmPayload());

    const result = await mapper.mapRecipe(SOURCE, { generate });

    assert.strictEqual(result.source_image, null);
    assert.strictEqual(result.draft.recipe_name, 'Spicy Arrabiata Penne');
  });
});
