const { coreApp, authAndIdentity } = require('../services');

const { shoppingListService } = coreApp;
const { serviceError } = authAndIdentity;
const { isServiceError } = serviceError;

function handleError(res, error, label) {
  if (isServiceError(error)) {
    return res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode
    });
  }

  console.error(`${label} error:`, error);
  return res.status(500).json({
    error: 'Internal server error',
    statusCode: 500
  });
}

function handleServiceResult(res, result) {
  return res.status(result.statusCode).json(result.body);
}

async function getIngredientOptions(req, res) {
  try {
    const result = await shoppingListService.getIngredientOptions(req.query.name);
    return handleServiceResult(res, result);
  } catch (error) {
    return handleError(res, error, 'getIngredientOptions');
  }
}

async function generateFromMealPlan(req, res) {
  try {
    const result = await shoppingListService.generateFromMealPlan({
      userId: req.body.user_id,
      mealPlanIds: req.body.meal_plan_ids
    });
    return handleServiceResult(res, result);
  } catch (error) {
    return handleError(res, error, 'generateFromMealPlan');
  }
}

async function createShoppingList(req, res) {
  try {
    const result = await shoppingListService.createShoppingList({
      userId: req.body.user_id,
      name: req.body.name,
      items: req.body.items,
      estimatedTotalCost: req.body.estimated_total_cost
    });
    return handleServiceResult(res, result);
  } catch (error) {
    return handleError(res, error, 'createShoppingList');
  }
}

async function getShoppingList(req, res) {
  try {
    const result = await shoppingListService.getShoppingList(req.query.user_id);
    return handleServiceResult(res, result);
  } catch (error) {
    return handleError(res, error, 'getShoppingList');
  }
}

async function updateShoppingListItem(req, res) {
  try {
    const result = await shoppingListService.updateShoppingListItem(req.params.id, {
      purchased: req.body.purchased,
      quantity: req.body.quantity,
      notes: req.body.notes
    });
    return handleServiceResult(res, result);
  } catch (error) {
    return handleError(res, error, 'updateShoppingListItem');
  }
}

async function addShoppingListItem(req, res) {
  try {
    const result = await shoppingListService.addShoppingListItem({
      shoppingListId: req.body.shopping_list_id,
      ingredientName: req.body.ingredient_name,
      category: req.body.category,
      quantity: req.body.quantity,
      unit: req.body.unit,
      measurement: req.body.measurement,
      notes: req.body.notes,
      mealTags: req.body.meal_tags,
      estimatedCost: req.body.estimated_cost
    });
    return handleServiceResult(res, result);
  } catch (error) {
    return handleError(res, error, 'addShoppingListItem');
  }
}

async function deleteShoppingListItem(req, res) {
  try {
    const result = await shoppingListService.deleteShoppingListItem(req.params.id);
    return handleServiceResult(res, result);
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
