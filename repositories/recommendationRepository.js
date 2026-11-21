const supabase = require('../dbConnection');

async function getRecentRecipeIdsByUserId(userId, limit = 20) {
  const { data, error } = await supabase
    .from('recipe_meal')
    .select('recipe_id')
    .eq('user_id', userId)
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

async function getCandidateRecipes(limit = 100) {
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id, recipe_name, description, ingredients, cuisine_id, cooking_method_id, total_servings, preparation_time, calories, fat, carbohydrates, protein, fiber, sodium, sugar, allergy, dislike'
    )
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

async function getLookupRowsByIds(table, ids) {
  if (table !== 'dietary_requirements' && table !== 'allergies') {
    throw new Error(`Unsupported recommendation lookup table: ${table}`);
  }

  const { data, error } = await supabase.from(table).select('id, name').in('id', ids);

  if (error) {
    throw error;
  }

  return data || [];
}

async function saveRecommendationSnapshot({
  userId,
  recommendationList,
  recommendationRows,
  source,
}) {
  const recommendationListQuery = supabase.from('recommendation_lists');

  if (typeof recommendationListQuery?.insert !== 'function') {
    return {
      enabled: false,
      persisted: false,
      reason: 'unsupported_client',
    };
  }

  const { data: listData, error: listError } = await recommendationListQuery
    .insert(recommendationList)
    .select('id')
    .single();

  if (listError) throw listError;

  const recommendationListId = listData.id;

  const { data: recommendationsData, error: recommendationsError } = await supabase
    .from('recommendations')
    .insert(
      recommendationRows.map((row) => ({
        ...row,
        recommendation_list_id: recommendationListId,
      }))
    )
    .select('id, recipe_id, rank');

  if (recommendationsError) throw recommendationsError;

  const recommendationIdByRecipeId = new Map(
    (recommendationsData || []).map((row) => [row.recipe_id, row.id])
  );

  const { error: resultsError } = await supabase.from('recommendation_results').insert(
    recommendationRows.map((row) => ({
      recommendation_list_id: recommendationListId,
      recipe_id: row.recipe_id,
      rank: row.rank,
      title: row.title,
      score: row.score,
      explanation: row.explanation,
      metadata: row.metadata,
    }))
  );

  if (resultsError) throw resultsError;

  const { error: userRecommendationsError } = await supabase.from('user_recommendations').insert(
    recommendationRows.map((row) => ({
      user_id: userId,
      recommendation_id: recommendationIdByRecipeId.get(row.recipe_id) || null,
      recommendation_list_id: recommendationListId,
      recipe_id: row.recipe_id,
      rank: row.rank,
      status: 'generated',
    }))
  );

  if (userRecommendationsError) throw userRecommendationsError;

  const { error: historyError } = await supabase.from('recommendation_history').insert({
    user_id: userId,
    recommendation_list_id: recommendationListId,
    event_type: 'generated',
    payload: {
      recommendationCount: recommendationRows.length,
      topRecipeId: recommendationRows[0]?.recipe_id || null,
      source,
    },
  });

  if (historyError) throw historyError;

  return {
    enabled: true,
    persisted: true,
    recommendationListId,
    resultCount: recommendationRows.length,
  };
}

module.exports = {
  getRecentRecipeIdsByUserId,
  getCandidateRecipes,
  getLookupRowsByIds,
  saveRecommendationSnapshot,
};
