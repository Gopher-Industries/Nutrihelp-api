const supabase = require('../dbConnection');
const { ServiceError } = require('./serviceError');

function successResponse(statusCode, data) {
  return {
    statusCode,
    body: {
      statusCode,
      message: 'success',
      data
    }
  };
}

class ShoppingListService {
  async getIngredientOptions(name) {
    if (!name) {
      throw new ServiceError(400, 'Ingredient name parameter is required');
    }

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

    if (error) {
      throw new ServiceError(500, 'Failed to query ingredient prices');
    }

    const formattedData = data.map((item) => ({
      id: item.id,
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredients?.name || 'Unknown',
      product_name: item.name || 'Unknown Product',
      package_size: item.unit || 1,
      unit: item.unit || 1,
      measurement: item.measurement || 'unit',
      price: item.price || 0,
      store: `Store ${item.store_id}`,
      store_location: 'Location not specified'
    }));

    return successResponse(200, formattedData);
  }

  async generateFromMealPlan({ userId, mealPlanIds }) {
    if (!userId || !Array.isArray(mealPlanIds)) {
      throw new ServiceError(400, 'User ID and meal plan IDs array are required');
    }

    const { data: mealPlanData, error: mealPlanError } = await supabase
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

    if (mealPlanError) {
      throw new ServiceError(500, 'Failed to query meal plans');
    }

    if (!mealPlanData || mealPlanData.length === 0) {
      throw new ServiceError(404, 'No meal plans found');
    }

    const ingredientMap = new Map();

    mealPlanData.forEach((meal) => {
      const mealType = meal.meal_type;
      const ingredients = meal.recipe_id?.recipe_ingredient || [];

      ingredients.forEach((ingredient) => {
        const key = `${ingredient.ingredient_id}_${ingredient.measurement}`;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.total_quantity += ingredient.quantity;
          if (!existing.meals.includes(mealType)) {
            existing.meals.push(mealType);
          }
          return;
        }

        ingredientMap.set(key, {
          ingredient_id: ingredient.ingredient_id,
          ingredient_name: ingredient.ingredients?.name || 'Unknown',
          category: ingredient.ingredients?.category || 'Other',
          total_quantity: ingredient.quantity,
          unit: ingredient.quantity,
          measurement: ingredient.measurement,
          meals: [mealType],
          estimated_cost: { min: 0, max: 0 }
        });
      });
    });

    const shoppingList = [];
    let totalMinCost = 0;
    let totalMaxCost = 0;

    for (const ingredient of ingredientMap.values()) {
      const { data: priceData } = await supabase
        .from('ingredient_price')
        .select('price, package_size, unit, measurement')
        .eq('ingredient_id', ingredient.ingredient_id);

      if (priceData && priceData.length > 0) {
        const prices = priceData.map((item) => item.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const minPackage = priceData.find((item) => item.price === minPrice);
        const maxPackage = priceData.find((item) => item.price === maxPrice);
        const minCost = Math.ceil(ingredient.total_quantity / minPackage.package_size) * minPrice;
        const maxCost = Math.ceil(ingredient.total_quantity / maxPackage.package_size) * maxPrice;

        ingredient.estimated_cost = { min: minCost, max: maxCost };
        totalMinCost += minCost;
        totalMaxCost += maxCost;
      }

      shoppingList.push(ingredient);
    }

    return successResponse(200, {
      shopping_list: shoppingList,
      summary: {
        total_items: shoppingList.length,
        total_estimated_cost: {
          min: Math.round(totalMinCost * 100) / 100,
          max: Math.round(totalMaxCost * 100) / 100
        },
        categories: [...new Set(shoppingList.map((item) => item.category))]
      }
    });
  }

  async createShoppingList({ userId, name, items, estimatedTotalCost }) {
    if (!userId || !name || !Array.isArray(items)) {
      throw new ServiceError(400, 'User ID, name and items array are required');
    }

    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .insert([{
        user_id: userId,
        name,
        estimated_total_cost: estimatedTotalCost || 0
      }])
      .select()
      .single();

    if (listError) {
      throw new ServiceError(500, 'Failed to create shopping list');
    }

    const shoppingListItems = items.map((item) => ({
      shopping_list_id: shoppingList.id,
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      measurement: item.measurement,
      notes: item.notes,
      purchased: item.purchased || false,
      meal_tags: item.meal_tags || [],
      estimated_cost: item.estimated_cost || 0
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from('shopping_list_items')
      .insert(shoppingListItems)
      .select();

    if (itemsError) {
      await supabase.from('shopping_lists').delete().eq('id', shoppingList.id);
      throw new ServiceError(500, 'Failed to add shopping list items');
    }

    return successResponse(201, {
      shopping_list: shoppingList,
      items: itemsData
    });
  }

  async getShoppingList(userId) {
    if (!userId) {
      throw new ServiceError(400, 'User ID is required');
    }

    const { data: shoppingLists, error: listsError } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (listsError) {
      throw new ServiceError(500, 'Failed to query shopping lists');
    }

    const result = [];
    for (const list of shoppingLists) {
      const { data: items, error: itemsError } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('shopping_list_id', list.id);

      if (itemsError) {
        continue;
      }

      const totalItems = items.length;
      const purchasedItems = items.filter((item) => item.purchased).length;

      result.push({
        ...list,
        items,
        progress: {
          total_items: totalItems,
          purchased_items: purchasedItems,
          completion_percentage: totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0
        }
      });
    }

    return successResponse(200, result);
  }

  async updateShoppingListItem(id, updates) {
    const updateData = {};
    if (updates.purchased !== undefined) updateData.purchased = updates.purchased;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('shopping_list_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ServiceError(500, 'Failed to update shopping list item');
    }

    return successResponse(200, data);
  }

  async addShoppingListItem(item) {
    if (!item.shoppingListId || !item.ingredientName) {
      throw new ServiceError(400, 'Shopping list ID and ingredient name are required');
    }

    const itemData = {
      shopping_list_id: item.shoppingListId,
      ingredient_name: item.ingredientName,
      category: item.category || 'pantry',
      quantity: item.quantity || 1,
      unit: item.unit || 'piece',
      measurement: item.measurement || item.unit || 'piece',
      notes: item.notes || '',
      purchased: false,
      meal_tags: item.mealTags || [],
      estimated_cost: item.estimatedCost || 0
    };

    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert([itemData])
      .select()
      .single();

    if (error) {
      throw new ServiceError(500, 'Failed to add shopping list item');
    }

    return successResponse(201, data);
  }

  async deleteShoppingListItem(id) {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw new ServiceError(500, 'Failed to delete shopping list item');
    }

    return {
      statusCode: 204,
      body: {
        statusCode: 204,
        message: 'success'
      }
    };
  }
}

module.exports = new ShoppingListService();
