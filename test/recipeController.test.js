const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

function createRecipeQueryStub(row) {
  return {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    limit() {
      return Promise.resolve({
        data: row ? [row] : [],
        error: null,
      });
    },
  };
}

describe('Recipe controller', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns normalized recipe detail for /recipe/:id', async () => {
    const recipeRow = {
      id: 12,
      recipe_name: 'Salmon Rice Bowl',
      description: 'Balanced lunch bowl',
      cuisine_id: 4,
      preparation_time: 25,
      total_servings: 2,
      image_id: 9,
      ingredients: {
        id: [21, 22],
        quantity: [150, 120],
      },
      instructions: 'Cook the rice.\nPan-sear the salmon.\nServe together.',
      calories: 620,
      protein: 38,
      fiber: 6,
      carbohydrates: 52,
      fat: 24,
      sodium: 310,
      sugar: 4,
      allergy: false,
      dislike: false,
    };

    const controller = proxyquire('../controller/recipeController', {
      '../dbConnection.js': {
        from(table) {
          expect(table).to.equal('recipes');
          return createRecipeQueryStub(recipeRow);
        },
      },
      '../model/getUserRecipes.js': {
        getCuisines: sinon.stub().resolves([{ id: 4, name: 'Japanese' }]),
        getIngredients: sinon.stub().resolves([
          { id: 21, name: 'Salmon', category: 'protein' },
          { id: 22, name: 'Rice', category: 'grain' },
        ]),
        getImageUrl: sinon.stub().resolves('https://cdn.example.com/recipe-12.png'),
      },
      '../model/createRecipe.js': {},
      '../model/deleteUserRecipes.js': {},
      'express-validator': {
        validationResult: () => ({ isEmpty: () => true, array: () => [] }),
      },
    });

    const req = { params: { id: '12' } };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.getRecipeById(req, res);

    expect(res.status.calledWith(200)).to.equal(true);
    const payload = res.json.firstCall.args[0];
    expect(payload.success).to.equal(true);
    expect(payload.data.item).to.deep.include({
      id: 12,
      recipeId: 12,
      title: 'Salmon Rice Bowl',
      cuisine: 'Japanese',
      imageUrl: 'https://cdn.example.com/recipe-12.png',
      preparationTime: 25,
      totalServings: 2,
    });
    expect(payload.data.item.instructions).to.have.length(3);
    expect(payload.data.item.ingredients[0]).to.deep.include({
      ingredientId: 21,
      name: 'Salmon',
      category: 'protein',
      quantity: 150,
    });
  });

  it('returns 404 when recipe detail is missing', async () => {
    const controller = proxyquire('../controller/recipeController', {
      '../dbConnection.js': {
        from() {
          return createRecipeQueryStub(null);
        },
      },
      '../model/getUserRecipes.js': {
        getCuisines: sinon.stub(),
        getIngredients: sinon.stub(),
        getImageUrl: sinon.stub(),
      },
      '../model/createRecipe.js': {},
      '../model/deleteUserRecipes.js': {},
      'express-validator': {
        validationResult: () => ({ isEmpty: () => true, array: () => [] }),
      },
    });

    const req = { params: { id: '404' } };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.getRecipeById(req, res);

    expect(res.status.calledWith(404)).to.equal(true);
    expect(res.json.firstCall.args[0]).to.deep.equal({
      success: false,
      error: {
        message: 'Recipe not found',
        code: 'RECIPE_NOT_FOUND',
      },
    });
  });
});
