/**
 * Unit tests for the external-ingredient resolver.
 *
 * resolveIngredients writes to the SHARED ingredients table, so it is never
 * exercised against a real client here: the Supabase module is proxyquired out
 * for a hand-rolled fake that records what would have been inserted. No test in
 * this file performs any I/O.
 */
const assert = require('assert');
const proxyquire = require('proxyquire');
const { normalizeName, singularize } = require('../../services/recipeSources/ingredientResolver');

const SILENT_LOGGER = { info() {}, warn() {}, error() {}, debug() {} };

/**
 * Minimal stand-in for the supabase-js query builder, covering exactly the three
 * chains the resolver uses:
 *   from().select().limit()                  -> existing vocabulary
 *   from().select().order().limit()          -> current max id
 *   from().insert().select().single()        -> create
 */
function fakeSupabase({ rows = [], maxId = 500, insertResults = [] } = {}) {
  const state = { maxId };
  const calls = { inserts: [], maxIdReads: 0, listReads: 0 };
  const pendingInserts = [...insertResults];

  const supabaseService = {
    from() {
      let ordered = false;
      let payload = null;

      const chain = {
        select() {
          return chain;
        },
        order() {
          ordered = true;
          return chain;
        },
        limit() {
          if (ordered) {
            calls.maxIdReads += 1;
            return Promise.resolve({ data: [{ id: state.maxId }], error: null });
          }
          calls.listReads += 1;
          return Promise.resolve({ data: rows, error: null });
        },
        insert(values) {
          payload = values;
          calls.inserts.push(values);
          return chain;
        },
        single() {
          const next = pendingInserts.shift();
          if (next && next.error) return Promise.resolve({ data: null, error: next.error });
          // Default success: the database echoes back the row as written.
          return Promise.resolve({ data: next?.data || payload, error: null });
        },
      };

      return chain;
    },
  };

  return { supabaseService, calls, state };
}

function loadResolver(fake) {
  return proxyquire('../../services/recipeSources/ingredientResolver', {
    '../supabaseClient': { supabaseService: fake.supabaseService, '@noCallThru': true },
    '../../utils/logger': { ...SILENT_LOGGER, '@noCallThru': true },
  });
}

const VOCABULARY = [
  { id: 1, name: 'Egg', category: 'Dairy' },
  { id: 2, name: 'Tomato', category: 'Fruit & Vegetables' },
  { id: 3, name: 'Cheese', category: 'Dairy' },
];

describe('resolveIngredients', () => {
  it('matches an existing ingredient exactly, ignoring case and whitespace', async () => {
    const fake = fakeSupabase({ rows: VOCABULARY });
    const { resolveIngredients } = loadResolver(fake);

    const [result] = await resolveIngredients([{ name: '  tomato ' }]);

    assert.strictEqual(result.status, 'matched');
    assert.strictEqual(result.id, 2);
    assert.strictEqual(result.matchedName, 'Tomato');
    assert.strictEqual(calledInserts(fake), 0);
  });

  it('matches across a simple plural', async () => {
    const fake = fakeSupabase({ rows: VOCABULARY });
    const { resolveIngredients } = loadResolver(fake);

    const [result] = await resolveIngredients([{ name: 'Tomatoes' }]);

    assert.strictEqual(result.status, 'matched');
    assert.strictEqual(result.id, 2);
    assert.strictEqual(calledInserts(fake), 0);
  });

  it('falls back to the head noun when the full name is absent', async () => {
    const fake = fakeSupabase({ rows: VOCABULARY });
    const { resolveIngredients } = loadResolver(fake);

    const [result] = await resolveIngredients([{ name: 'Parmigiano-Reggiano cheese' }]);

    assert.strictEqual(result.status, 'matched');
    assert.strictEqual(result.id, 3);
    assert.strictEqual(result.matchedName, 'Cheese');
  });

  it('does not insert anything unless createMissing is set', async () => {
    const fake = fakeSupabase({ rows: VOCABULARY });
    const { resolveIngredients } = loadResolver(fake);

    const [result] = await resolveIngredients([{ name: 'penne rigate', category: 'Pantry' }]);

    assert.strictEqual(result.status, 'unmatched');
    assert.strictEqual(result.id, null);
    // The caller's own category must survive: stamping one here is what produced
    // systematically wrong 'Pantry' rows previously.
    assert.strictEqual(result.category, null);
    assert.strictEqual(calledInserts(fake), 0);
  });

  it('creates the missing ingredient when createMissing is set', async () => {
    const fake = fakeSupabase({ rows: VOCABULARY, maxId: 500 });
    const { resolveIngredients } = loadResolver(fake);

    const [result] = await resolveIngredients(
      [{ name: 'penne rigate', category: 'Pantry' }],
      { createMissing: true }
    );

    assert.strictEqual(result.status, 'created');
    assert.strictEqual(result.id, 501);
    assert.deepStrictEqual(fake.calls.inserts, [
      { id: 501, name: 'penne rigate', category: 'Pantry' },
    ]);
  });

  it('resolves a duplicate name within one recipe to the row it just created', async () => {
    const fake = fakeSupabase({ rows: VOCABULARY, maxId: 500 });
    const { resolveIngredients } = loadResolver(fake);

    const results = await resolveIngredients(
      [
        { name: 'penne rigate', category: 'Pantry' },
        { name: 'Penne Rigate', category: 'Pantry' },
      ],
      { createMissing: true }
    );

    assert.strictEqual(results[0].status, 'created');
    assert.strictEqual(results[1].status, 'matched');
    assert.strictEqual(results[1].id, results[0].id);
    // One insert, not two — the second occurrence must not mint a duplicate row.
    assert.strictEqual(calledInserts(fake), 1);
  });

  it('reports status failed when the insert errors', async () => {
    const fake = fakeSupabase({
      rows: VOCABULARY,
      insertResults: [{ error: { message: 'permission denied', code: '42501' } }],
    });
    const { resolveIngredients } = loadResolver(fake);

    const [result] = await resolveIngredients(
      [{ name: 'penne rigate', category: 'Pantry' }],
      { createMissing: true }
    );

    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(result.id, null);
  });

  it('returns an empty array without touching the database for no ingredients', async () => {
    const fake = fakeSupabase({ rows: VOCABULARY });
    const { resolveIngredients } = loadResolver(fake);

    assert.deepStrictEqual(await resolveIngredients([]), []);
    assert.strictEqual(fake.calls.listReads, 0);
  });
});

function calledInserts(fake) {
  return fake.calls.inserts.length;
}

describe('normalizeName', () => {
  it('lowercases and strips punctuation', () => {
    assert.strictEqual(normalizeName('Parmigiano-Reggiano'), 'parmigiano reggiano');
  });

  it('collapses whitespace', () => {
    assert.strictEqual(normalizeName('  chopped   tomatoes '), 'chopped tomatoes');
  });

  it('returns an empty string for non-strings', () => {
    assert.strictEqual(normalizeName(null), '');
    assert.strictEqual(normalizeName(undefined), '');
  });
});

describe('singularize', () => {
  it('folds simple plurals', () => {
    assert.strictEqual(singularize('mushrooms'), 'mushroom');
    assert.strictEqual(singularize('carrots'), 'carrot');
  });

  it('folds -ies plurals', () => {
    assert.strictEqual(singularize('berries'), 'berry');
  });

  it('folds -es plurals', () => {
    assert.strictEqual(singularize('tomatoes'), 'tomato');
  });

  it('leaves -ss words alone', () => {
    assert.strictEqual(singularize('watercress'), 'watercress');
  });

  it('leaves short words alone', () => {
    assert.strictEqual(singularize('gas'), 'gas');
  });
});
