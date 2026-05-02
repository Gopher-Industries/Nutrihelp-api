const { validationResult } = require('express-validator');
let { add, get, deletePlan, saveMealRelation } = require('../model/mealPlan.js');
const {
  createErrorResponse,
  createSuccessResponse,
  formatMealPlans
} = require('../services/apiResponseService');

function validationFailure(res, errors) {
  return res.status(400).json({ errors: errors.array() });
}

function internalFailure(res, code) {
  return res.status(500).json(createErrorResponse('Internal server error', code));
}

function resolveTargetUserId(req) {
  const bodyUserId = req.body?.user_id;
  const queryUserId = req.query?.user_id;

  if (req.user?.role === 'admin' || req.user?.role === 'nutritionist') {
    return bodyUserId || queryUserId || req.user?.userId;
  }

  return req.user?.userId || bodyUserId || queryUserId;
}

const addMealPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationFailure(res, errors);
    }

    const { recipe_ids, meal_type, user_id } = req.body;

    const meal_plan = await add(user_id, { recipe_ids }, meal_type);

    await saveMealRelation(user_id, recipe_ids, meal_plan[0].id);

    return res.status(201).json(createSuccessResponse({
      mealPlan: meal_plan
    }, {
      message: 'Meal plan created successfully'
    }));
  } catch (error) {
    console.error({ error: 'error' });
    return internalFailure(res, 'MEALPLAN_CREATE_FAILED');
  }
};

const getMealPlan = async (req, res) => {
  try {
    const requestedUserId = resolveTargetUserId(req);
    if (!requestedUserId) {
      return res.status(400).json(createErrorResponse('User ID is required', 'VALIDATION_ERROR'));
    }

    const meal_plans = await get(requestedUserId);

    return res.status(200).json(createSuccessResponse({
      items: formatMealPlans(meal_plans || [])
    }, {
      count: Array.isArray(meal_plans) ? meal_plans.length : 0
    }));
  } catch (error) {
    console.error({ error: 'error' });
    return internalFailure(res, 'MEALPLANS_LOAD_FAILED');
  }
};

const deleteMealPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationFailure(res, errors);
    }

    const { id, user_id } = req.body;

    await deletePlan(id, user_id);

    return res.status(200).json(createSuccessResponse(null, {
      message: 'Meal plan deleted successfully'
    }));
  } catch (error) {
    console.error({ error: 'error' });
    return internalFailure(res, 'MEALPLAN_DELETE_FAILED');
  }
};

module.exports = { addMealPlan, getMealPlan, deleteMealPlan };
