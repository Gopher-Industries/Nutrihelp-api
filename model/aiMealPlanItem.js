const supabase = require('../dbConnection.js');

async function addAiMealItem(userId, item) {
  const { data, error } = await supabase
    .from('ai_meal_plan_items')
    .insert({
      user_id: userId,
      meal_type: item.meal_type,
      day: item.day || null,
      name: item.name,
      description: item.description || null,
      calories: item.calories ?? null,
      proteins: item.proteins ?? null,
      fats: item.fats ?? null,
      sodium: item.sodium ?? null,
      fiber: item.fiber ?? null,
      vitamins: item.vitamins || null,
      ingredients: item.ingredients || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getAiMealItems(userId) {
  const { data, error } = await supabase
    .from('ai_meal_plan_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function deleteAiMealItem(id, userId) {
  const { error } = await supabase
    .from('ai_meal_plan_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

module.exports = { addAiMealItem, getAiMealItems, deleteAiMealItem };
