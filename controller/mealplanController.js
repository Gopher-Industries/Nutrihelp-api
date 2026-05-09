const { validationResult } = require('express-validator');
let { add, get, deletePlan, saveMealRelation } = require('../model/mealPlan.js');
const { addAiMealItem, getAiMealItems, deleteAiMealItem } = require('../model/aiMealPlanItem.js');
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

function sameDate(value, requestedDate) {
  if (!value || !requestedDate) {
    return false;
  }

  return String(value).slice(0, 10) === String(requestedDate).slice(0, 10);
}

function buildMealPlanSummary(items) {
  const recipes = items.flatMap((item) => item.recipes || []);
  const byMealType = items.reduce((acc, item) => {
    const key = item.mealType || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalItems: items.length,
    totalRecipes: recipes.length,
    byMealType,
    dates: [...new Set(items.map((item) => item.date).filter(Boolean))]
  };
}

const addMealPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationFailure(res, errors);
    }

    const targetUserId = resolveTargetUserId(req);
    const { recipe_ids, meal_type } = req.body;

    const meal_plan = await add(targetUserId, { recipe_ids }, meal_type);

    await saveMealRelation(targetUserId, recipe_ids, meal_plan[0].id);

    const formattedItems = formatMealPlans(meal_plan || []);

    const response = createSuccessResponse({
      item: formattedItems[0] || null,
      items: formattedItems
    }, {
      message: 'Meal plan created successfully'
    });
    response.item = response.data.item;
    response.items = response.data.items;
    response.mealPlan = response.data.items;

    return res.status(201).json(response);
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

    const date = req.query?.date || req.query?.created_at || null;
    const mealType = req.query?.meal_type || req.query?.mealType || null;
    const meal_plans = await get(requestedUserId);
    let items = formatMealPlans(meal_plans || []);

    if (date) {
      items = items.filter((item) => sameDate(item.createdAt, date));
    }

    if (mealType) {
      items = items.filter((item) => String(item.mealType || '').toLowerCase() === String(mealType).toLowerCase());
    }

    const response = createSuccessResponse({
      items,
      mealPlans: items,
      dailyMeals: items,
      summary: buildMealPlanSummary(items)
    }, {
      count: items.length,
      userId: requestedUserId,
      date: date || null,
      mealType: mealType || null
    });
    response.items = items;
    response.meal_plans = items;
    response.mealPlans = items;
    response.daily_meals = items;

    return res.status(200).json(response);
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

    const targetUserId = resolveTargetUserId(req);
    const planId = req.body.id || req.body.meal_plan_id;

    if (!planId) {
      return res.status(400).json(createErrorResponse('Plan ID is required', 'VALIDATION_ERROR'));
    }

    await deletePlan(planId, targetUserId);

    return res.status(200).json(createSuccessResponse(null, {
      message: 'Meal plan deleted successfully'
    }));
  } catch (error) {
    console.error({ error: 'error' });
    return internalFailure(res, 'MEALPLAN_DELETE_FAILED');
  }
};

const addAiMealSuggestion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationFailure(res, errors);
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json(createErrorResponse('Unauthorized', 'UNAUTHORIZED'));
    }

    const item = await addAiMealItem(userId, req.body);

    return res.status(201).json(createSuccessResponse(
      { item },
      { message: 'AI meal suggestion saved to your daily plan' }
    ));
  } catch (error) {
    console.error('[mealplanController] addAiMealSuggestion error:', error);
    return internalFailure(res, 'AI_MEAL_SAVE_FAILED');
  }
};

const getAiMealSuggestions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json(createErrorResponse('Unauthorized', 'UNAUTHORIZED'));
    }

    const items = await getAiMealItems(userId);

    return res.status(200).json(createSuccessResponse(
      { items },
      { count: items.length }
    ));
  } catch (error) {
    console.error('[mealplanController] getAiMealSuggestions error:', error);
    return internalFailure(res, 'AI_MEALS_LOAD_FAILED');
  }
};

const deleteAiMealSuggestion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationFailure(res, errors);
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json(createErrorResponse('Unauthorized', 'UNAUTHORIZED'));
    }

    await deleteAiMealItem(req.body.id, userId);

    return res.status(200).json(createSuccessResponse(
      null,
      { message: 'AI meal suggestion removed from your daily plan' }
    ));
  } catch (error) {
    console.error('[mealplanController] deleteAiMealSuggestion error:', error);
    return internalFailure(res, 'AI_MEAL_DELETE_FAILED');
  }
};

module.exports = {
  addMealPlan,
  getMealPlan,
  deleteMealPlan,
  addAiMealSuggestion,
  getAiMealSuggestions,
  deleteAiMealSuggestion,
};
