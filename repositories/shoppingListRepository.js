const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function findIngredientOptionsByName(name) {
  try {
    const { data, error } = await supabase
      .from('ingredient_price')
      .select(`
        id,
        ingredient_id,
        name,
        unit,
        measurement,
        price,
        store_id,
        ingredients!inner(name, category)
      `)
      .ilike('ingredients.name', `%${name}%`)
      .order('price', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load ingredient options', error, { name });
  }
}

async function findMealPlanIngredients(userId, mealPlanIds) {
  try {
    const { data, error } = await supabase
      .from('recipe_meal')
      .select(`
        mealplan_id,
        recipe_id,
        meal_type,
        recipe_id!inner(
          recipe_ingredient!inner(
            ingredient_id,
            quantity,
            measurement,
            ingredients!inner(name, category)
          )
        )
      `)
      .in('mealplan_id', mealPlanIds)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load meal plan ingredients', error, { userId });
  }
}

async function findIngredientPricesByIngredientId(ingredientId) {
  try {
    const { data, error } = await supabase
      .from('ingredient_price')
      .select('price, unit, measurement')
      .eq('ingredient_id', ingredientId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load ingredient prices', error, { ingredientId });
  }
}

async function createShoppingList({ userId, name, estimatedTotalCost = 0 }) {
  try {
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert([{
        user_id: userId,
        name,
        estimated_total_cost: estimatedTotalCost
      }])
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create shopping list', error, { userId, name });
  }
}

async function createShoppingListItems(items) {
  try {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert(items)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create shopping list items', error);
  }
}

async function deleteShoppingListById(id) {
  try {
    const { error } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    throw wrapRepositoryError('Failed to delete shopping list', error, { id });
  }
}

async function getShoppingListsByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load shopping lists', error, { userId });
  }
}

async function getShoppingListItemsByListId(listId) {
  try {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('shopping_list_id', listId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load shopping list items', error, { listId });
  }
}

async function updateShoppingListItemById(id, updateData) {
  try {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to update shopping list item', error, { id });
  }
}

async function addShoppingListItem(itemData) {
  try {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert([itemData])
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to add shopping list item', error);
  }
}

async function deleteShoppingListItemById(id) {
  try {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    throw wrapRepositoryError('Failed to delete shopping list item', error, { id });
  }
}

module.exports = {
  addShoppingListItem,
  createShoppingList,
  createShoppingListItems,
  deleteShoppingListById,
  deleteShoppingListItemById,
  findIngredientOptionsByName,
  findIngredientPricesByIngredientId,
  findMealPlanIngredients,
  getShoppingListItemsByListId,
  getShoppingListsByUserId,
  updateShoppingListItemById
};
