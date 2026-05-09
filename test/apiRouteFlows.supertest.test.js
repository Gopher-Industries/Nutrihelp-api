const { expect } = require('chai');
const express = require('express');
const http = require('http');
const request = require('supertest');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

function jsonMiddleware(_req, _res, next) {
  next();
}

function makeAuthMiddleware(user = { userId: 42, email: 'route@test.dev', role: 'user' }) {
  return (req, _res, next) => {
    req.user = user;
    next();
  };
}

function passthroughRoleMiddleware() {
  return (_req, _res, next) => next();
}

function buildApp(mountPath, router) {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  return app;
}

async function listenOnLoopback(app) {
  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  return server;
}

describe('API route flows via supertest', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('routes POST /api/recommendations through auth into the recommendation controller', async () => {
    const getRecommendations = sinon.stub().callsFake((req, res) => {
      return res.status(200).json({
        ok: true,
        userId: req.user.userId,
        dietaryConstraints: req.body.dietaryConstraints,
      });
    });

    const router = proxyquire('../routes/recommendations', {
      '../controller': {
        coreApp: {
          recommendations: { getRecommendations },
        },
      },
      '../middleware/authenticateToken': {
        authenticateToken: makeAuthMiddleware(),
      },
    });

    const app = buildApp('/api/recommendations', router);
    const server = await listenOnLoopback(app);
    const res = await request(server)
      .post('/api/recommendations')
      .send({ dietaryConstraints: {}, maxResults: 3 });
    await new Promise((resolve) => server.close(resolve));

    expect(res.status).to.equal(200);
    expect(getRecommendations.calledOnce).to.equal(true);
    expect(res.body).to.deep.equal({
      ok: true,
      userId: 42,
      dietaryConstraints: {},
    });
  });

  it('routes GET /api/mealplan with query filters into the meal plan controller', async () => {
    const getMealPlan = sinon.stub().callsFake((req, res) => {
      return res.status(200).json({
        ok: true,
        query: req.query,
        user: req.user,
      });
    });

    const router = proxyquire('../routes/mealplan', {
      '../controller': {
        coreApp: {
          mealplan: {
            addMealPlan: sinon.stub(),
            getMealPlan,
            deleteMealPlan: sinon.stub(),
            addAiMealSuggestion: sinon.stub(),
            getAiMealSuggestions: sinon.stub(),
            deleteAiMealSuggestion: sinon.stub(),
          },
        },
      },
      '../validators/mealplanValidator.js': {
        addMealPlanValidation: [jsonMiddleware],
        getMealPlanValidation: [jsonMiddleware],
        deleteMealPlanValidation: [jsonMiddleware],
      },
      '../validators/aiMealSuggestionValidator.js': {
        addAiMealSuggestionValidation: [jsonMiddleware],
        deleteAiMealSuggestionValidation: [jsonMiddleware],
      },
      '../middleware/validateRequest.js': jsonMiddleware,
      '../middleware/authenticateToken.js': {
        authenticateToken: makeAuthMiddleware(),
      },
      '../middleware/authorizeRoles.js': () => passthroughRoleMiddleware(),
    });

    const app = buildApp('/api/mealplan', router);
    const server = await listenOnLoopback(app);
    const res = await request(server)
      .get('/api/mealplan')
      .query({ user_id: 42, date: '2026-05-03', meal_type: 'breakfast' });
    await new Promise((resolve) => server.close(resolve));

    expect(res.status).to.equal(200);
    expect(getMealPlan.calledOnce).to.equal(true);
    expect(res.body.ok).to.equal(true);
    expect(res.body.query).to.deep.include({
      user_id: '42',
      date: '2026-05-03',
      meal_type: 'breakfast',
    });
    expect(res.body.user).to.deep.include({
      userId: 42,
      role: 'user',
    });
  });

  it('routes POST and DELETE /api/mealplan through the shared meal plan endpoint', async () => {
    const addMealPlan = sinon.stub().callsFake((req, res) => res.status(201).json({ created: req.body }));
    const deleteMealPlan = sinon.stub().callsFake((req, res) => res.status(200).json({ deleted: req.body }));

    const router = proxyquire('../routes/mealplan', {
      '../controller': {
        coreApp: {
          mealplan: {
            addMealPlan,
            getMealPlan: sinon.stub(),
            deleteMealPlan,
            addAiMealSuggestion: sinon.stub(),
            getAiMealSuggestions: sinon.stub(),
            deleteAiMealSuggestion: sinon.stub(),
          },
        },
      },
      '../validators/mealplanValidator.js': {
        addMealPlanValidation: [jsonMiddleware],
        getMealPlanValidation: [jsonMiddleware],
        deleteMealPlanValidation: [jsonMiddleware],
      },
      '../validators/aiMealSuggestionValidator.js': {
        addAiMealSuggestionValidation: [jsonMiddleware],
        deleteAiMealSuggestionValidation: [jsonMiddleware],
      },
      '../middleware/validateRequest.js': jsonMiddleware,
      '../middleware/authenticateToken.js': {
        authenticateToken: makeAuthMiddleware(),
      },
      '../middleware/authorizeRoles.js': () => passthroughRoleMiddleware(),
    });

    const app = buildApp('/api/mealplan', router);
    const server = await listenOnLoopback(app);

    const postRes = await request(server)
      .post('/api/mealplan')
      .send({ user_id: 42, meal_type: 'dinner', recipe_ids: [3, 7] });

    const deleteRes = await request(server)
      .delete('/api/mealplan')
      .send({ meal_plan_id: 99, user_id: 42 });
    await new Promise((resolve) => server.close(resolve));

    expect(postRes.status).to.equal(201);
    expect(addMealPlan.calledOnce).to.equal(true);
    expect(postRes.body.created).to.deep.equal({
      user_id: 42,
      meal_type: 'dinner',
      recipe_ids: [3, 7],
    });

    expect(deleteRes.status).to.equal(200);
    expect(deleteMealPlan.calledOnce).to.equal(true);
    expect(deleteRes.body.deleted).to.deep.equal({
      meal_plan_id: 99,
      user_id: 42,
    });
  });

  it('routes GET /api/recipe/:id into the recipe detail controller', async () => {
    const getRecipeById = sinon.stub().callsFake((req, res) => {
      return res.status(200).json({
        recipeId: Number(req.params.id),
        title: 'Salmon Rice Bowl',
      });
    });

    const router = proxyquire('../routes/recipe', {
      '../controller/recipeController.js': {
        createAndSaveRecipe: sinon.stub(),
        getRecipes: sinon.stub(),
        getRecipeById,
        deleteRecipe: sinon.stub(),
      },
      '../validators/recipeValidator.js': {
        validateRecipe: [jsonMiddleware],
      },
      '../middleware/validateRequest.js': jsonMiddleware,
    });

    const app = buildApp('/api/recipe', router);
    const server = await listenOnLoopback(app);
    const res = await request(server).get('/api/recipe/12');
    await new Promise((resolve) => server.close(resolve));

    expect(res.status).to.equal(200);
    expect(getRecipeById.calledOnce).to.equal(true);
    expect(res.body).to.deep.equal({
      recipeId: 12,
      title: 'Salmon Rice Bowl',
    });
  });

  it('routes POST /api/shopping-list/from-meal-plan into the shopping list controller', async () => {
    const generateFromMealPlan = sinon.stub().callsFake((req, res) => {
      return res.status(200).json({
        mealPlanIds: req.body.meal_plan_ids,
        userId: req.body.user_id,
      });
    });

    const router = proxyquire('../routes/shoppingList', {
      '../controller': {
        coreApp: {
          shoppingList: {
            getIngredientOptions: sinon.stub(),
            generateFromMealPlan,
            createShoppingList: sinon.stub(),
            getShoppingList: sinon.stub(),
            addShoppingListItem: sinon.stub(),
            updateShoppingListItem: sinon.stub(),
            deleteShoppingListItem: sinon.stub(),
          },
        },
      },
      '../validators/shoppingListValidator.js': {
        getIngredientOptionsValidation: [jsonMiddleware],
        generateFromMealPlanValidation: [jsonMiddleware],
        createShoppingListValidation: [jsonMiddleware],
        getShoppingListValidation: [jsonMiddleware],
        addShoppingListItemValidation: [jsonMiddleware],
        updateShoppingListItemValidation: [jsonMiddleware],
        deleteShoppingListItemValidation: [jsonMiddleware],
      },
      '../middleware/validateRequest.js': jsonMiddleware,
    });

    const app = buildApp('/api/shopping-list', router);
    const server = await listenOnLoopback(app);
    const res = await request(server)
      .post('/api/shopping-list/from-meal-plan')
      .send({ user_id: 42, meal_plan_ids: [11, 12] });
    await new Promise((resolve) => server.close(resolve));

    expect(res.status).to.equal(200);
    expect(generateFromMealPlan.calledOnce).to.equal(true);
    expect(res.body).to.deep.equal({
      mealPlanIds: [11, 12],
      userId: 42,
    });
  });
});
