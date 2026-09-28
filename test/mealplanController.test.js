const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Meal plan controller', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns normalized meal plan items and summary for daily queries', async () => {
    const get = sinon.stub().resolves([
      {
        id: 1,
        meal_type: 'breakfast',
        created_at: '2026-05-03T08:00:00.000Z',
        recipes: [
          {
            recipe_id: {
              id: 101,
              recipe_name: 'Protein Oats',
              preparation_time: 10,
              total_servings: 1,
              calories: 420,
              protein: 24,
              fiber: 8,
              carbohydrates: 44,
              fat: 12,
              sodium: 180,
              sugar: 6,
              ingredients: {
                id: [1],
                quantity: [80],
                name: ['Rolled oats'],
                category: ['grain'],
              },
              cuisine: { name: 'Australian' },
              cooking_method: { name: 'Boiled' },
            },
          },
        ],
      },
      {
        id: 2,
        meal_type: 'dinner',
        created_at: '2026-05-04T18:00:00.000Z',
        recipes: [],
      },
    ]);

    const controller = proxyquire('../controller/mealplanController', {
      '../model/mealPlan.js': {
        add: sinon.stub(),
        get,
        deletePlan: sinon.stub(),
        saveMealRelation: sinon.stub(),
      },
      '../model/aiMealPlanItem.js': {
        addAiMealItem: sinon.stub(),
        getAiMealItems: sinon.stub(),
        deleteAiMealItem: sinon.stub(),
      },
      'express-validator': {
        validationResult: () => ({ isEmpty: () => true, array: () => [] }),
      },
    });

    const req = {
      user: { userId: 9, role: 'user' },
      query: { date: '2026-05-03', meal_type: 'breakfast' },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.getMealPlan(req, res);

    expect(get.calledOnceWith(9)).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);

    const payload = res.json.firstCall.args[0];
    expect(payload.success).to.equal(true);
    expect(payload.data.items).to.have.length(1);
    expect(payload.data.items[0]).to.deep.include({
      id: 1,
      mealType: 'breakfast',
      meal_type: 'breakfast',
      recipeCount: 1,
      date: '2026-05-03',
    });
    expect(payload.data.items[0].recipes[0]).to.deep.include({
      recipeId: 101,
      title: 'Protein Oats',
    });
    expect(payload.data.summary).to.deep.include({
      totalItems: 1,
      totalRecipes: 1,
    });
    expect(payload.meta).to.deep.include({
      count: 1,
      userId: 9,
      date: '2026-05-03',
      mealType: 'breakfast',
    });
  });

  it('uses the authenticated user when a normal user adds a meal plan', async () => {
    const add = sinon.stub().resolves([{ id: 77, meal_type: 'lunch', created_at: '2026-05-03T12:00:00.000Z' }]);
    const saveMealRelation = sinon.stub().resolves();

    const controller = proxyquire('../controller/mealplanController', {
      '../model/mealPlan.js': {
        add,
        get: sinon.stub(),
        deletePlan: sinon.stub(),
        saveMealRelation,
      },
      '../model/aiMealPlanItem.js': {
        addAiMealItem: sinon.stub(),
        getAiMealItems: sinon.stub(),
        deleteAiMealItem: sinon.stub(),
      },
      'express-validator': {
        validationResult: () => ({ isEmpty: () => true, array: () => [] }),
      },
    });

    const req = {
      user: { userId: 15, role: 'user' },
      body: { user_id: 999, meal_type: 'lunch', recipe_ids: [5, 8] },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.addMealPlan(req, res);

    expect(add.calledOnceWith(15, { recipe_ids: [5, 8] }, 'lunch')).to.equal(true);
    expect(saveMealRelation.calledOnceWith(15, [5, 8], 77)).to.equal(true);
    expect(res.status.calledWith(201)).to.equal(true);
  });

  it('accepts meal_plan_id alias on delete and scopes deletion to the authenticated user', async () => {
    const deletePlan = sinon.stub().resolves();

    const controller = proxyquire('../controller/mealplanController', {
      '../model/mealPlan.js': {
        add: sinon.stub(),
        get: sinon.stub(),
        deletePlan,
        saveMealRelation: sinon.stub(),
      },
      '../model/aiMealPlanItem.js': {
        addAiMealItem: sinon.stub(),
        getAiMealItems: sinon.stub(),
        deleteAiMealItem: sinon.stub(),
      },
      'express-validator': {
        validationResult: () => ({ isEmpty: () => true, array: () => [] }),
      },
    });

    const req = {
      user: { userId: 15, role: 'user' },
      body: { meal_plan_id: 33, user_id: 999 },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.deleteMealPlan(req, res);

    expect(deletePlan.calledOnceWith(33, 15)).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
  });
});
