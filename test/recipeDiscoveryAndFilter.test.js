/**
 * Tests for the refined recipe discovery, filter, and ownership flows.
 *
 * Behaviour under test:
 *   - GET /api/filter pushes cuisine_id / search to Supabase server-side
 *   - GET /api/recipe/community paginates and sorts server-side
 *   - share/unshare community endpoints ignore body user_id and derive
 *     ownership from req.user.userId
 *
 * We use Jest's built-in `expect` and module mocking (rather than chai/sinon)
 * because the chai v6 dependency in this repo is ESM-only and not loadable
 * from CommonJS Jest.
 */

function buildFromMock(handler) {
  return (table) => handler(table);
}

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

afterEach(() => {
  jest.resetModules();
});

describe('GET /api/filter (filterController.filterRecipes)', () => {
  test('applies cuisine_id and search server-side and respects limit', async () => {
    const calls = {
      cuisineEqArgs: null,
      ilikeArgs: null,
      rangeArgs: null,
    };

    const recipesQuery = {
      select() { return this; },
      eq(col, val) {
        if (col === 'cuisine_id') calls.cuisineEqArgs = [col, val];
        return this;
      },
      ilike(col, pattern) {
        calls.ilikeArgs = [col, pattern];
        return this;
      },
      range(from, to) {
        calls.rangeArgs = [from, to];
        return Promise.resolve({
          data: [
            { id: 1, recipe_name: 'Curry Bowl', cuisine_id: 7, ingredients: [] },
            { id: 2, recipe_name: 'Curry Wrap', cuisine_id: 7, ingredients: [] },
            { id: 3, recipe_name: 'Curry Soup', cuisine_id: 7, ingredients: [] },
          ],
          error: null,
        });
      },
    };

    jest.doMock('../dbConnection', () => ({
      from: buildFromMock(() => recipesQuery),
    }), { virtual: false });

    const controller = require('../controller/filterController');

    const req = { query: { cuisine_id: '7', search: 'curry', limit: '2', offset: '0' } };
    const res = makeRes();

    await controller.filterRecipes(req, res);

    expect(calls.cuisineEqArgs).toEqual(['cuisine_id', 7]);
    expect(calls.ilikeArgs[0]).toBe('recipe_name');
    expect(calls.ilikeArgs[1]).toBe('%curry%');
    expect(calls.rangeArgs[0]).toBe(0);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(2); // limit honoured after filtering
  });

  test('rejects a non-numeric cuisine_id with 400', async () => {
    jest.doMock('../dbConnection', () => ({
      from: buildFromMock(() => ({
        select() { return this; },
        eq() { return this; },
        ilike() { return this; },
        range() { return Promise.resolve({ data: [], error: null }); },
      })),
    }));

    const controller = require('../controller/filterController');

    const req = { query: { cuisine_id: 'not-a-number' } };
    const res = makeRes();

    await controller.filterRecipes(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toEqual({ error: 'cuisine_id must be numeric' });
  });

  test('escapes % and _ in the search term', async () => {
    let capturedPattern = null;
    const recipesQuery = {
      select() { return this; },
      eq() { return this; },
      ilike(_col, pattern) {
        capturedPattern = pattern;
        return this;
      },
      range() {
        return Promise.resolve({ data: [], error: null });
      },
    };
    jest.doMock('../dbConnection', () => ({
      from: buildFromMock(() => recipesQuery),
    }));
    const controller = require('../controller/filterController');

    const req = { query: { search: '50%_off' } };
    const res = makeRes();

    await controller.filterRecipes(req, res);

    expect(capturedPattern).toBe('%50\\%\\_off%');
  });
});

describe('GET /api/recipe/community (recipeController.listCommunityRecipes)', () => {
  test('pushes search, cuisine_id, sort, and pagination to Supabase', async () => {
    const calls = {
      eqs: [],
      ilike: null,
      order: null,
      range: null,
    };

    const recipesQuery = {
      select() { return this; },
      eq(col, val) {
        calls.eqs.push([col, val]);
        return this;
      },
      ilike(col, pattern) {
        calls.ilike = [col, pattern];
        return this;
      },
      order(col, opts) {
        calls.order = [col, opts];
        return this;
      },
      range(from, to) {
        calls.range = [from, to];
        return Promise.resolve({ data: [], error: null });
      },
    };

    jest.doMock('../dbConnection.js', () => ({
      from: buildFromMock(() => recipesQuery),
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    }));
    jest.doMock('../model/createRecipe.js', () => ({}));
    jest.doMock('../model/getUserRecipes.js', () => ({}));
    jest.doMock('../model/deleteUserRecipes.js', () => ({}));

    const controller = require('../controller/recipeController');

    const req = {
      query: {
        search: 'tofu',
        cuisine_id: '3',
        sort: 'name',
        limit: '25',
        offset: '50',
      },
    };
    const res = makeRes();

    await controller.listCommunityRecipes(req, res);

    const eqMap = new Map(calls.eqs);
    expect(eqMap.get('visibility')).toBe('community');
    expect(eqMap.get('is_published')).toBe(true);
    expect(eqMap.get('cuisine_id')).toBe(3);
    expect(calls.ilike).toEqual(['recipe_name', '%tofu%']);
    expect(calls.order).toEqual(['recipe_name', { ascending: true }]);
    expect(calls.range).toEqual([50, 74]); // offset .. offset+limit-1
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty('pagination');
    expect(payload.pagination).toMatchObject({ limit: 25, offset: 50 });
  });

  test('defaults to latest ordering when sort is omitted', async () => {
    let capturedOrder = null;
    const recipesQuery = {
      select() { return this; },
      eq() { return this; },
      order(col, opts) {
        capturedOrder = [col, opts];
        return this;
      },
      range() {
        return Promise.resolve({ data: [], error: null });
      },
    };
    jest.doMock('../dbConnection.js', () => ({
      from: buildFromMock(() => recipesQuery),
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    }));
    jest.doMock('../model/createRecipe.js', () => ({}));
    jest.doMock('../model/getUserRecipes.js', () => ({}));
    jest.doMock('../model/deleteUserRecipes.js', () => ({}));

    const controller = require('../controller/recipeController');

    const req = { query: {} };
    const res = makeRes();

    await controller.listCommunityRecipes(req, res);

    expect(capturedOrder).toEqual(['published_at', { ascending: false }]);
  });
});

describe('share/unshare community endpoints — ownership', () => {
  test('share ignores body user_id and uses req.user.userId', async () => {
    const recipeRow = { id: 99, user_id: 42, recipe_name: 'Test' };
    let capturedUserIdEq = null;
    let updatePayload = null;
    let notificationPayload = null;

    const recipesQuery = {
      select() { return this; },
      eq(col, val) {
        if (col === 'user_id') capturedUserIdEq = val;
        return this;
      },
      single() {
        return Promise.resolve({ data: recipeRow, error: null });
      },
      update(payload) {
        updatePayload = payload;
        return {
          eq() { return Promise.resolve({ error: null }); },
        };
      },
    };

    const notificationsQuery = {
      insert(payload) {
        notificationPayload = payload;
        return Promise.resolve({ error: null });
      },
    };

    jest.doMock('../dbConnection.js', () => ({
      from: buildFromMock((table) => {
        if (table === 'recipes') return recipesQuery;
        if (table === 'notifications') return notificationsQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    }));
    jest.doMock('../model/createRecipe.js', () => ({}));
    jest.doMock('../model/getUserRecipes.js', () => ({}));
    jest.doMock('../model/deleteUserRecipes.js', () => ({}));

    const controller = require('../controller/recipeController');

    // The caller tries to spoof a different user via body — must be ignored.
    const req = {
      params: { id: '99' },
      body: { user_id: 999, userId: 999 },
      user: { userId: 42 },
    };
    const res = makeRes();

    await controller.shareRecipeToCommunity(req, res);

    expect(capturedUserIdEq).toBe(42);
    expect(updatePayload).toMatchObject({
      visibility: 'community_pending',
      is_published: false,
    });
    expect(notificationPayload.user_id).toBe(42);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('share returns 400 when there is no authenticated user', async () => {
    jest.doMock('../dbConnection.js', () => ({
      from: buildFromMock(() => ({
        select() { return this; },
        eq() { return this; },
        single() { return Promise.resolve({ data: null, error: null }); },
      })),
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    }));
    jest.doMock('../model/createRecipe.js', () => ({}));
    jest.doMock('../model/getUserRecipes.js', () => ({}));
    jest.doMock('../model/deleteUserRecipes.js', () => ({}));

    const controller = require('../controller/recipeController');

    const req = { params: { id: '99' }, body: { user_id: 1 }, user: undefined };
    const res = makeRes();

    await controller.shareRecipeToCommunity(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('unshare ignores body user_id and uses req.user.userId', async () => {
    const recipeRow = {
      id: 88,
      user_id: 7,
      recipe_name: 'Test 2',
      visibility: 'community_pending',
    };
    let capturedUserIdEq = null;

    const recipesQuery = {
      select() { return this; },
      eq(col, val) {
        if (col === 'user_id') capturedUserIdEq = val;
        return this;
      },
      single() { return Promise.resolve({ data: recipeRow, error: null }); },
      update() {
        return {
          eq() {
            return {
              eq() { return Promise.resolve({ error: null }); },
            };
          },
        };
      },
    };
    const notificationsQuery = {
      insert() { return Promise.resolve({ error: null }); },
    };
    jest.doMock('../dbConnection.js', () => ({
      from: buildFromMock((table) => {
        if (table === 'recipes') return recipesQuery;
        if (table === 'notifications') return notificationsQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    }));
    jest.doMock('../model/createRecipe.js', () => ({}));
    jest.doMock('../model/getUserRecipes.js', () => ({}));
    jest.doMock('../model/deleteUserRecipes.js', () => ({}));

    const controller = require('../controller/recipeController');

    const req = {
      params: { id: '88' },
      body: { user_id: 12345 },
      user: { userId: 7 },
    };
    const res = makeRes();

    await controller.unshareRecipeFromCommunity(req, res);

    expect(capturedUserIdEq).toBe(7);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
