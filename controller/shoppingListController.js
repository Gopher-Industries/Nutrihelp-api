const { validationResult } = require('express-validator');
const supabase = require('../dbConnection.js');

// 1. Get ingredient options API - GET /api/ingredient-options
// Search ingredients by name and return price, store, and package information
const getIngredientOptions = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name } = req.query;
        
        if (!name) {
            return res.status(400).json({ 
                error: 'Ingredient name parameter is required', 
                statusCode: 400 
            });
        }

        // Query ingredient_price table with partial name matching
        // Fixed JOIN syntax for Supabase
        let { data, error } = await supabase
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
            console.error('Error querying ingredient prices:', error);
            return res.status(500).json({ 
                error: 'Failed to query ingredient prices', 
                statusCode: 500 
            });
        }

        // Format response data to match expected structure
        const formattedData = data.map(item => ({
            id: item.id,
            ingredient_id: item.ingredient_id,
            ingredient_name: item.ingredients?.name || 'Unknown', // Fixed: use ingredients.name directly
            product_name: item.name || 'Unknown Product', // Use 'name' column as product_name
            package_size: item.unit || 1,
            unit: item.unit || 1,
            measurement: item.measurement || 'unit',
            price: item.price || 0,
            store: `Store ${item.store_id}`, // Convert store_id to store name
            store_location: 'Location not specified' // Default value since not in actual table
        }));

        return res.status(200).json({
            statusCode: 200,
            message: 'success',
            data: formattedData
        });

    } catch (error) {
        console.error('getIngredientOptions error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            statusCode: 500 
        });
    }
};

// 2. Generate shopping list from meal plan API - POST /api/shopping-list/from-meal-plan
// Merge ingredient needs from selected meals and return aggregated quantities
const generateFromMealPlan = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { user_id, meal_plan_ids, meal_types } = req.body;

        if (!user_id || !meal_plan_ids || !Array.isArray(meal_plan_ids)) {
            return res.status(400).json({ 
                error: 'User ID and meal plan IDs array are required', 
                statusCode: 400 
            });
        }

        // Get ingredient information from meal plans
        // Fixed JOIN syntax for Supabase
        let { data: mealPlanData, error: mealPlanError } = await supabase
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
            .in('mealplan_id', meal_plan_ids)
            .eq('user_id', user_id);

        if (mealPlanError) {
            console.error('Error querying meal plans:', mealPlanError);
            return res.status(500).json({ 
                error: 'Failed to query meal plans', 
                statusCode: 500 
            });
        }

        if (!mealPlanData || mealPlanData.length === 0) {
            return res.status(404).json({ 
                error: 'No meal plans found', 
                statusCode: 404 
            });
        }

        // Aggregate ingredient requirements
        const ingredientMap = new Map();
        
        mealPlanData.forEach(meal => {
            const mealType = meal.meal_type;
            const ingredients = meal.recipe_id?.recipe_ingredient || [];
            
            ingredients.forEach(ingredient => {
                const key = `${ingredient.ingredient_id}_${ingredient.measurement}`;
                
                if (ingredientMap.has(key)) {
                    const existing = ingredientMap.get(key);
                    existing.total_quantity += ingredient.quantity;
                    if (!existing.meals.includes(mealType)) {
                        existing.meals.push(mealType);
                    }
                } else {
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
                }
            });
        });

        // Get price information and calculate costs
        const shoppingList = [];
        let totalMinCost = 0;
        let totalMaxCost = 0;

        for (const [key, ingredient] of ingredientMap) {
            // Query price information
            const { data: priceData, error: priceError } = await supabase
                .from('ingredient_price')
                .select('price, package_size, unit, measurement')
                .eq('ingredient_id', ingredient.ingredient_id);

            if (priceData && priceData.length > 0) {
                // Calculate costs
                const prices = priceData.map(item => item.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                
                // Estimate purchase quantities
                const minPackage = priceData.find(item => item.price === minPrice);
                const maxPackage = priceData.find(item => item.price === maxPrice);
                
                const minCost = Math.ceil(ingredient.total_quantity / minPackage.package_size) * minPrice;
                const maxCost = Math.ceil(ingredient.total_quantity / maxPackage.package_size) * maxPrice;
                
                ingredient.estimated_cost = { min: minCost, max: maxCost };
                totalMinCost += minCost;
                totalMaxCost += maxCost;
            }

            shoppingList.push(ingredient);
        }

        // Group by category
        const categories = [...new Set(shoppingList.map(item => item.category))];

        return res.status(200).json({
            statusCode: 200,
            message: 'success',
            data: {
                shopping_list: shoppingList,
                summary: {
                    total_items: shoppingList.length,
                    total_estimated_cost: {
                        min: Math.round(totalMinCost * 100) / 100,
                        max: Math.round(totalMaxCost * 100) / 100
                    },
                    categories: categories
                }
            }
        });

    } catch (error) {
        console.error('generateFromMealPlan error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            statusCode: 500 
        });
    }
};

// 3. Create shopping list API - POST /api/shopping-list
// Store shopping lists for logged-in users in the database
const createShoppingList = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { user_id, name, items, estimated_total_cost } = req.body;

        if (!user_id || !name || !Array.isArray(items)) {
            return res.status(400).json({ 
                error: 'User ID, name and items array are required', 
                statusCode: 400 
            });
        }

        // Create shopping list
        const { data: shoppingList, error: listError } = await supabase
            .from('shopping_lists')
            .insert([{
                user_id,
                name,
                estimated_total_cost: estimated_total_cost || 0
            }])
            .select()
            .single();

        if (listError) {
            console.error('Error creating shopping list:', listError);
            return res.status(500).json({ 
                error: 'Failed to create shopping list', 
                statusCode: 500 
            });
        }

        // Add shopping list items
        const shoppingListItems = items.map(item => ({
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
            console.error('Error adding shopping list items:', itemsError);
            // Delete the created shopping list
            await supabase
                .from('shopping_lists')
                .delete()
                .eq('id', shoppingList.id);
            
            return res.status(500).json({ 
                error: 'Failed to add shopping list items', 
                statusCode: 500 
            });
        }

        return res.status(201).json({
            statusCode: 201,
            message: 'success',
            data: {
                shopping_list: shoppingList,
                items: itemsData
            }
        });

    } catch (error) {
        console.error('createShoppingList error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            statusCode: 500 
        });
    }
};

// 4. Get shopping list API - GET /api/shopping-list
// Retrieve shopping lists for logged-in users
const getShoppingList = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ 
                error: 'User ID is required', 
                statusCode: 400 
            });
        }

        // Get user's shopping lists
        const { data: shoppingLists, error: listsError } = await supabase
            .from('shopping_lists')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (listsError) {
            console.error('Error querying shopping lists:', listsError);
            return res.status(500).json({ 
                error: 'Failed to query shopping lists', 
                statusCode: 500 
            });
        }

        // Get items for each list
        const result = [];
        for (const list of shoppingLists) {
            const { data: items, error: itemsError } = await supabase
                .from('shopping_list_items')
                .select('*')
                .eq('shopping_list_id', list.id);

            if (itemsError) {
                console.error('Error querying shopping list items:', itemsError);
                continue;
            }

            // Calculate progress
            const totalItems = items.length;
            const purchasedItems = items.filter(item => item.purchased).length;
            const completionPercentage = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;

            result.push({
                ...list,
                items: items,
                progress: {
                    total_items: totalItems,
                    purchased_items: purchasedItems,
                    completion_percentage: completionPercentage
                }
            });
        }

        return res.status(200).json({
            statusCode: 200,
            message: 'success',
            data: result
        });

    } catch (error) {
        console.error('getShoppingList error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            statusCode: 500 
        });
    }
};

// 5. Update shopping list item status API - PATCH /api/shopping-list/items/:id
// Update item status (purchased, quantity, notes)
const updateShoppingListItem = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { purchased, quantity, notes } = req.body;

        const updateData = {};
        if (purchased !== undefined) updateData.purchased = purchased;
        if (quantity !== undefined) updateData.quantity = quantity;
        if (notes !== undefined) updateData.notes = notes;

        const { data, error } = await supabase
            .from('shopping_list_items')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating shopping list item:', error);
            return res.status(500).json({ 
                error: 'Failed to update shopping list item', 
                statusCode: 500 
            });
        }

        return res.status(200).json({
            statusCode: 200,
            message: 'success',
            data: data
        });

    } catch (error) {
        console.error('updateShoppingListItem error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            statusCode: 500 
        });
    }
};

// 6. Add shopping list item API - POST /api/shopping-list/items
// Add a new item to existing shopping list
const addShoppingListItem = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { shopping_list_id, ingredient_name, category, quantity, unit, measurement, notes, meal_tags, estimated_cost } = req.body;

        if (!shopping_list_id || !ingredient_name) {
            return res.status(400).json({ 
                error: 'Shopping list ID and ingredient name are required', 
                statusCode: 400 
            });
        }

        const itemData = {
            shopping_list_id,
            ingredient_name,
            category: category || 'pantry',
            quantity: quantity || 1,
            unit: unit || 'piece',
            measurement: measurement || unit || 'piece',
            notes: notes || '',
            purchased: false,
            meal_tags: meal_tags || [],
            estimated_cost: estimated_cost || 0
        };

        const { data, error } = await supabase
            .from('shopping_list_items')
            .insert([itemData])
            .select()
            .single();

        if (error) {
            console.error('Error adding shopping list item:', error);
            return res.status(500).json({ 
                error: 'Failed to add shopping list item', 
                statusCode: 500 
            });
        }

        return res.status(201).json({
            statusCode: 201,
            message: 'success',
            data: data
        });

    } catch (error) {
        console.error('addShoppingListItem error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            statusCode: 500 
        });
    }
};

// 7. Delete shopping list item API - DELETE /api/shopping-list/items/:id
// Remove item from shopping list
const deleteShoppingListItem = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;

        const { error } = await supabase
            .from('shopping_list_items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting shopping list item:', error);
            return res.status(500).json({ 
                error: 'Failed to delete shopping list item', 
                statusCode: 500 
            });
        }

        return res.status(204).json({
            statusCode: 204,
            message: 'success'
        });

    } catch (error) {
        console.error('deleteShoppingListItem error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            statusCode: 500 
        });
    }
};

module.exports = {
    getIngredientOptions,
    generateFromMealPlan,
    createShoppingList,
    getShoppingList,
    addShoppingListItem,
    updateShoppingListItem,
    deleteShoppingListItem
};
