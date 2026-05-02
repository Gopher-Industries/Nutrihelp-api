const shoppingListService = require('../services/shoppingListService');
const { isServiceError } = require('../services/serviceError');
const normalizeId = require('../utils/normalizeId');

function handleError(res, error, label) {
  if (isServiceError(error)) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      statusCode: error.statusCode
    });
  }

  console.error(`${label} error:`, error);
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    statusCode: 500
  });
}

function sendWrapped(res, statusCode, body) {
  // If service already returned our standardized envelope, forward as-is
  if (body && typeof body === 'object' && ('success' in body)) {
    return res.status(statusCode).json(body);
  }

  // Otherwise wrap successful bodies under { success: true, data: ... }
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    data: statusCode >= 200 && statusCode < 300 ? body : undefined,
    error: statusCode >= 400 ? (body && body.error ? body.error : body) : undefined
  });
}

async function getIngredientOptions(req, res) {
  try {
    const name = req.query?.name || '';
    const result = await shoppingListService.getIngredientOptions(name);

    return sendWrapped(res, result.statusCode || 200, result.body || result);
  } catch (error) {
    return handleError(res, error, 'getIngredientOptions');
  }
}

async function generateFromMealPlan(req, res) {
  try {
    if (!req.body || !req.body.user_id) {
      return res.status(400).json({ success: false, error: 'user_id required' });
    }

    const userId = normalizeId(req.body.user_id);
    const mealPlanIds = Array.isArray(req.body.meal_plan_ids) ? req.body.meal_plan_ids : [];

    const result = await shoppingListService.generateFromMealPlan({
      userId,
      mealPlanIds
    });

    return sendWrapped(res, result.statusCode || 200, result.body || result);
  } catch (error) {
    return handleError(res, error, 'generateFromMealPlan');
  }
}

async function createShoppingList(req, res) {
  try {
    if (!req.body || !req.body.user_id) {
      return res.status(400).json({ success: false, error: 'user_id required' });
    }

    const userId = normalizeId(req.body.user_id);
    const result = await shoppingListService.createShoppingList({
      userId,
      name: req.body.name,
      items: req.body.items,
      estimatedTotalCost: req.body.estimated_total_cost
    });

    return sendWrapped(res, result.statusCode || 201, result.body || result);
  } catch (error) {
    return handleError(res, error, 'createShoppingList');
  }
}

async function getShoppingList(req, res) {
  try {
    const rawUserId = req.query?.user_id || req.query?.userId;
    if (!rawUserId) {
      return res.status(400).json({ success: false, error: 'user_id required' });
    }
    const userId = normalizeId(rawUserId);

    const result = await shoppingListService.getShoppingList(userId);
    return sendWrapped(res, result.statusCode || 200, result.body || result);
  } catch (error) {
    return handleError(res, error, 'getShoppingList');
  }
}

async function updateShoppingListItem(req, res) {
  try {
    const rawId = req.params?.id;
    if (!rawId) {
      return res.status(400).json({ success: false, error: 'id param required' });
    }
    const id = normalizeId(rawId);

    const payload = {
      purchased: req.body?.purchased,
      quantity: req.body?.quantity,
      notes: req.body?.notes
    };

    const result = await shoppingListService.updateShoppingListItem(id, payload);
    return sendWrapped(res, result.statusCode || 200, result.body || result);
  } catch (error) {
    return handleError(res, error, 'updateShoppingListItem');
  }
}

async function addShoppingListItem(req, res) {
  try {
    const payload = {
      shoppingListId: req.body?.shopping_list_id ? normalizeId(req.body.shopping_list_id) : undefined,
      ingredientName: req.body?.ingredient_name,
      category: req.body?.category,
      quantity: req.body?.quantity,
      unit: req.body?.unit,
      measurement: req.body?.measurement,
      notes: req.body?.notes,
      mealTags: req.body?.meal_tags,
      estimatedCost: req.body?.estimated_cost
    };

    const result = await shoppingListService.addShoppingListItem(payload);
    return sendWrapped(res, result.statusCode || 201, result.body || result);
  } catch (error) {
    return handleError(res, error, 'addShoppingListItem');
  }
}

async function deleteShoppingListItem(req, res) {
  try {
    const rawId = req.params?.id;
    if (!rawId) {
      return res.status(400).json({ success: false, error: 'id param required' });
    }
    const id = normalizeId(rawId);

    const result = await shoppingListService.deleteShoppingListItem(id);
    return sendWrapped(res, result.statusCode || 200, result.body || result);
  } catch (error) {
    return handleError(res, error, 'deleteShoppingListItem');
  }
}

module.exports = {
  getIngredientOptions,
  generateFromMealPlan,
  createShoppingList,
  getShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem
};
