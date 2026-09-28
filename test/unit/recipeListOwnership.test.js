const assert = require('node:assert/strict');
const proxyquire = require('proxyquire').noCallThru();

function setup({ linkedIds = [284, 285], queryError = null } = {}) {
  const owned = [283, 284, 285, 286].map(id => ({
    id, recipe_name: `Recipe ${id}`, user_id: 960,
    ingredients: { id: [1], quantity: [100] },
  }));
  const ownershipFilters = [];
  const db = {
    from(table) {
      const query = {
        select() { return this; },
        eq(column, value) {
          ownershipFilters.push([table, column, value]);
          return this;
        },
        order() { return Promise.resolve({ data: owned, error: queryError }); },
        in() { return Promise.resolve({ data: [], error: null }); },
      };
      return query;
    },
  };
  const controller = proxyquire('../../controller/recipeController', {
    '../dbConnection.js': db,
    '../model/createRecipe.js': {},
    '../model/deleteUserRecipes.js': {},
    '../model/getUserRecipes.js': {
      getUserRecipesRelation: async () => linkedIds.map(recipe_id => ({ recipe_id })),
      getUserRecipes: async () => owned.filter(row => linkedIds.includes(row.id)).map(row => ({
        ...row, ingredients: { ...row.ingredients },
      })),
      getIngredients: async () => [{ id: 1, name: 'Rice', category: 'Grain' }],
      getCuisines: async () => [],
      findReusableRecipeImageId: async () => null,
      getImageUrl: async () => '',
    },
    'express-validator': {},
  });
  const res = {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return { controller, res, ownershipFilters };
}

describe('Recipe list ownership', () => {
  it('includes owned recipes missing ingredient links without duplicating linked recipes', async () => {
    const { controller, res, ownershipFilters } = setup();
    await controller.getRecipes({ user: { userId: 960, role: 'user' }, body: { user_id: 999 } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body.recipes.map(row => row.id), [283, 284, 285, 286]);
    assert.deepEqual(res.body.recipes.find(row => row.id === 284).ingredients.name, ['Rice']);
    assert.deepEqual(ownershipFilters, [['recipes', 'user_id', 960]]);
  });

  it('lists owned recipes when none have ingredient links', async () => {
    const { controller, res } = setup({ linkedIds: [] });
    await controller.getRecipes({ user: { userId: 960, role: 'user' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.recipes.length, 4);
  });

  it('does not report a partial successful list when the owned-recipe query fails', async () => {
    const { controller, res } = setup({ queryError: new Error('Recipe query unavailable') });
    const originalError = console.error;
    console.error = () => {};
    try {
      await controller.getRecipes({ user: { userId: 960, role: 'user' } }, res);
    } finally {
      console.error = originalError;
    }
    assert.equal(res.code, 500);
    assert.equal(res.body.recipes, undefined);
  });
});
