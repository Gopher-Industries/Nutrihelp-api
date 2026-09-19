/**
 * Route-level tests for the gram weights accepted by POST /api/recipe/createRecipe.
 *
 * The weights come from /api/recipe-sources/resolve-ingredients and let the
 * save calculation total recipes measured in cups or cloves. The model and the
 * database are proxyquired out, so nothing is written.
 */
const assert = require('node:assert/strict');
const express = require('express');
const sinon = require('sinon');
const request = require('supertest');
const proxyquire = require('proxyquire').noCallThru();
const { validateRecipe } = require('../../validators/recipeValidator');

function buildApp() {
  const createRecipe = sinon.stub().resolves({ ingredients: {} });
  const controller = proxyquire('../../controller/recipeController', {
    '../dbConnection.js': {},
    '../model/getUserRecipes.js': {},
    '../model/deleteUserRecipes.js': {},
    '../model/createRecipe.js': {
      createRecipe,
      saveRecipe: sinon.stub().resolves([{ id: 900 }]),
      saveRecipeRelation: sinon.stub().resolves([]),
    },
  });

  const app = express();
  app.use(express.json());
  app.post(
    '/api/recipe/createRecipe',
    (req, _res, next) => {
      req.user = { userId: 960 };
      next();
    },
    validateRecipe,
    controller.createAndSaveRecipe
  );
  return { app, createRecipe };
}

function body(overrides = {}) {
  return {
    recipe_name: 'Arrabiata',
    cuisine_id: 1,
    total_servings: 2,
    preparation_time: 20,
    instructions: 'Cook.',
    cooking_method_id: 1,
    ingredient_id: [3, 63],
    ingredient_quantity: [0.25, 2],
    ingredient_unit: ['cup', 'cloves'],
    ...overrides,
  };
}

function metadataPassedToModel(createRecipe) {
  return createRecipe.firstCall.args[10];
}

describe('POST /api/recipe/createRecipe gram weights', () => {
  it('hands the gram weights and their sources to the save calculation', async () => {
    const { app, createRecipe } = buildApp();

    await request(app)
      .post('/api/recipe/createRecipe')
      .send(body({ ingredient_grams: [54.42, 6], ingredient_grams_source: ['usda_density', 'usda_portion'] }))
      .expect(201);

    const metadata = metadataPassedToModel(createRecipe);
    assert.deepEqual(metadata.grams, [54.42, 6]);
    assert.deepEqual(metadata.grams_source, ['usda_density', 'usda_portion']);
    assert.deepEqual(metadata.unit, ['cup', 'cloves']);
  });

  it('accepts an unknown weight as null and a negligible one as zero', async () => {
    const { app, createRecipe } = buildApp();

    await request(app)
      .post('/api/recipe/createRecipe')
      .send(body({ ingredient_grams: [null, 0] }))
      .expect(201);

    assert.deepEqual(metadataPassedToModel(createRecipe).grams, [null, 0]);
  });

  it('keeps working for clients that send no gram weights', async () => {
    const { app, createRecipe } = buildApp();

    await request(app).post('/api/recipe/createRecipe').send(body()).expect(201);

    const metadata = metadataPassedToModel(createRecipe);
    assert.equal(metadata.grams, undefined);
    assert.deepEqual(metadata.unit, ['cup', 'cloves']);
  });

  it('rejects gram weights that do not line up with the ingredients', async () => {
    const { app, createRecipe } = buildApp();

    await request(app)
      .post('/api/recipe/createRecipe')
      .send(body({ ingredient_grams: [54.42] }))
      .expect(400);

    assert.equal(createRecipe.called, false);
  });

  it('rejects a negative or non-numeric gram weight', async () => {
    for (const bad of [-1, 'heavy']) {
      const { app, createRecipe } = buildApp();

      await request(app)
        .post('/api/recipe/createRecipe')
        .send(body({ ingredient_grams: [bad, 6] }))
        .expect(400);

      assert.equal(createRecipe.called, false, String(bad));
    }
  });

  it('rejects an unreasonably heavy ingredient, which would be a unit mix-up', async () => {
    const { app } = buildApp();

    await request(app)
      .post('/api/recipe/createRecipe')
      .send(body({ ingredient_grams: [500000, 6] }))
      .expect(400);
  });
});
