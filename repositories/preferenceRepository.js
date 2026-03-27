const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function fetchUserPreferences(userId) {
  try {
    const [
      dietaryRequirements,
      allergies,
      cuisines,
      dislikes,
      healthConditions,
      spiceLevels,
      cookingMethods
    ] = await Promise.all([
      supabase.from('user_dietary_requirements').select('...dietary_requirement_id(id, name)').eq('user_id', userId),
      supabase.from('user_allergies').select('...allergy_id(id, name)').eq('user_id', userId),
      supabase.from('user_cuisines').select('...cuisine_id(id, name)').eq('user_id', userId),
      supabase.from('user_dislikes').select('...dislike_id(id, name)').eq('user_id', userId),
      supabase.from('user_health_conditions').select('...health_condition_id(id, name)').eq('user_id', userId),
      supabase.from('user_spice_levels').select('...spice_level_id(id, name)').eq('user_id', userId),
      supabase.from('user_cooking_methods').select('...cooking_method_id(id, name)').eq('user_id', userId)
    ]);

    for (const result of [dietaryRequirements, allergies, cuisines, dislikes, healthConditions, spiceLevels, cookingMethods]) {
      if (result.error) throw result.error;
    }

    return {
      dietary_requirements: dietaryRequirements.data || [],
      allergies: allergies.data || [],
      cuisines: cuisines.data || [],
      dislikes: dislikes.data || [],
      health_conditions: healthConditions.data || [],
      spice_levels: spiceLevels.data || [],
      cooking_methods: cookingMethods.data || []
    };
  } catch (error) {
    throw wrapRepositoryError('Failed to load user preferences', error, { userId });
  }
}

async function replaceUserPreferences(userId, body) {
  try {
    const requiredFields = ['dietary_requirements', 'allergies', 'cuisines', 'dislikes', 'health_conditions', 'spice_levels', 'cooking_methods'];
    for (const field of requiredFields) {
      if (!body[field]) {
        throw new Error('Missing required fields');
      }
    }

    const deleteOps = [
      supabase.from('user_dietary_requirements').delete().eq('user_id', userId),
      supabase.from('user_allergies').delete().eq('user_id', userId),
      supabase.from('user_cuisines').delete().eq('user_id', userId),
      supabase.from('user_dislikes').delete().eq('user_id', userId),
      supabase.from('user_health_conditions').delete().eq('user_id', userId),
      supabase.from('user_spice_levels').delete().eq('user_id', userId),
      supabase.from('user_cooking_methods').delete().eq('user_id', userId)
    ];

    const deleteResults = await Promise.all(deleteOps);
    for (const result of deleteResults) {
      if (result.error) throw result.error;
    }

    const insertOps = [
      supabase.from('user_dietary_requirements').insert(body.dietary_requirements.map((id) => ({ user_id: userId, dietary_requirement_id: id }))),
      supabase.from('user_allergies').insert(body.allergies.map((id) => ({ user_id: userId, allergy_id: id }))),
      supabase.from('user_cuisines').insert(body.cuisines.map((id) => ({ user_id: userId, cuisine_id: id }))),
      supabase.from('user_dislikes').insert(body.dislikes.map((id) => ({ user_id: userId, dislike_id: id }))),
      supabase.from('user_health_conditions').insert(body.health_conditions.map((id) => ({ user_id: userId, health_condition_id: id }))),
      supabase.from('user_spice_levels').insert(body.spice_levels.map((id) => ({ user_id: userId, spice_level_id: id }))),
      supabase.from('user_cooking_methods').insert(body.cooking_methods.map((id) => ({ user_id: userId, cooking_method_id: id })))
    ];

    const insertResults = await Promise.all(insertOps);
    for (const result of insertResults) {
      if (result.error) throw result.error;
    }

    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to replace user preferences', error, { userId });
  }
}

async function getSavedUserAllergies(userId) {
  try {
    const { data, error } = await supabase
      .from('user_allergies')
      .select(`
        allergy_id,
        ingredients (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('allergy', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load saved user allergies', error, { userId });
  }
}

module.exports = {
  fetchUserPreferences,
  getSavedUserAllergies,
  replaceUserPreferences
};
