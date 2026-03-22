const supabase = require('../dbConnection');
const fetchUserPreferences = require('../model/fetchUserPreferences');
const getUserProfile = require('../model/getUserProfile');
const {
  AI_ADAPTER_VERSION,
  resolveAiRecommendationSignals
} = require('./recommendationAiAdapter');

const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const RECOMMENDATION_RESPONSE_VERSION = 'recommendation-response-v1';
const recommendationCache = new Map();

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function compact(arr) {
  return (arr || []).filter(Boolean);
}

function unique(arr) {
  return [...new Set(compact(arr))];
}

function normalizeNameList(items) {
  return unique((items || []).map((item) => {
    if (!item) return null;
    if (typeof item === 'string') return item.trim().toLowerCase();
    return item.name ? String(item.name).trim().toLowerCase() : null;
  }));
}

function normalizeIdList(items) {
  return unique((items || []).map((item) => {
    if (item == null) return null;
    if (typeof item === 'number') return item;
    if (typeof item === 'string' && item.trim() !== '' && !Number.isNaN(Number(item))) return Number(item);
    if (typeof item === 'object' && item.id != null && !Number.isNaN(Number(item.id))) return Number(item.id);
    return null;
  }));
}

function normalizeHealthGoals(healthGoals) {
  if (!healthGoals) {
    return {
      labels: [],
      targetCalories: null,
      prioritizeProtein: false,
      prioritizeFiber: false,
      limitSugar: false,
      limitSodium: false
    };
  }

  const labels = Array.isArray(healthGoals)
    ? normalizeNameList(healthGoals)
    : normalizeNameList([
        ...(healthGoals.labels || []),
        healthGoals.primaryGoal,
        healthGoals.goal
      ]);

  return {
    labels,
    targetCalories: Number.isFinite(Number(healthGoals.targetCalories))
      ? Number(healthGoals.targetCalories)
      : null,
    prioritizeProtein: Boolean(healthGoals.prioritizeProtein),
    prioritizeFiber: Boolean(healthGoals.prioritizeFiber),
    limitSugar: Boolean(healthGoals.limitSugar),
    limitSodium: Boolean(healthGoals.limitSodium)
  };
}

async function fetchRecentRecipeIds(userId) {
  const { data, error } = await supabase
    .from('recipe_meal')
    .select('recipe_id')
    .eq('user_id', userId)
    .limit(20);

  if (error) {
    throw error;
  }

  return unique((data || []).map((row) => row.recipe_id));
}

async function fetchCandidateRecipes(limit = 50) {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, recipe_name, cuisine_id, cooking_method_id, total_servings, preparation_time, calories, fat, carbohydrates, protein, fiber, sodium, sugar, allergy, dislike')
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

function buildExplanation(reasons, fallbackReason) {
  const explanationParts = reasons.slice(0, 3);

  if (!explanationParts.length && fallbackReason) {
    explanationParts.push(fallbackReason);
  }

  return explanationParts.join('; ');
}

function scoreRecipe(recipe, context) {
  const reasons = [];
  const matchedSignals = [];
  let score = 0;

  if (recipe.allergy || recipe.dislike) {
    return null;
  }

  if (context.excludedRecipeIds.includes(recipe.id)) {
    return null;
  }

  if (context.preferredCuisineIds.includes(recipe.cuisine_id)) {
    score += 20;
    reasons.push('matches preferred cuisine');
    matchedSignals.push('preferred_cuisine');
  }

  if (context.preferredCookingMethodIds.includes(recipe.cooking_method_id)) {
    score += 12;
    reasons.push('matches preferred cooking method');
    matchedSignals.push('preferred_cooking_method');
  }

  if (context.preferredRecipeIds.includes(recipe.id)) {
    score += 25;
    reasons.push('boosted by AI preference signal');
    matchedSignals.push('ai_preferred_recipe');
  }

  if (context.goalState.prioritizeProtein && Number(recipe.protein || 0) >= 15) {
    score += 12;
    reasons.push('supports higher protein intake');
    matchedSignals.push('high_protein');
  }

  if (context.goalState.prioritizeFiber && Number(recipe.fiber || 0) >= 5) {
    score += 12;
    reasons.push('supports higher fiber intake');
    matchedSignals.push('high_fiber');
  }

  if (context.goalState.limitSugar) {
    if (Number(recipe.sugar || 0) <= 10) {
      score += 12;
      reasons.push('fits lower sugar preference');
      matchedSignals.push('low_sugar');
    } else {
      score -= 10;
    }
  }

  if (context.goalState.limitSodium) {
    if (Number(recipe.sodium || 0) <= 400) {
      score += 12;
      reasons.push('fits lower sodium preference');
      matchedSignals.push('low_sodium');
    } else {
      score -= 10;
    }
  }

  if (context.goalState.targetCalories != null && Number.isFinite(Number(recipe.calories))) {
    const delta = Math.abs(Number(recipe.calories) - context.goalState.targetCalories);
    if (delta <= 100) {
      score += 10;
      reasons.push('close to target calories');
      matchedSignals.push('target_calories');
    } else if (delta <= 250) {
      score += 4;
    }
  }

  if (context.recentRecipeIds.includes(recipe.id)) {
    score -= 15;
    reasons.push('deprioritized because it was recently served');
    matchedSignals.push('recent_recipe_penalty');
  }

  if (!reasons.length) {
    score += 2;
  }

  return {
    recipeId: recipe.id,
    title: recipe.recipe_name,
    score,
    explanation: buildExplanation(reasons, 'fallback recommendation based on available nutrition data'),
    metadata: {
      cuisineId: recipe.cuisine_id,
      cookingMethodId: recipe.cooking_method_id,
      nutrition: {
        calories: recipe.calories ?? null,
        protein: recipe.protein ?? null,
        fiber: recipe.fiber ?? null,
        sugar: recipe.sugar ?? null,
        sodium: recipe.sodium ?? null,
        fat: recipe.fat ?? null,
        carbohydrates: recipe.carbohydrates ?? null
      },
      preparationTime: recipe.preparation_time ?? null,
      totalServings: recipe.total_servings ?? null,
      matchedSignals,
      sourceTags: unique([
        context.aiSource,
        context.strategy,
        ...(context.aiExplanationTags || [])
      ]),
      explanationMetadata: {
        aiApplied: context.aiApplied,
        fallbackUsed: context.fallbackUsed,
        adapterFailed: context.adapterFailed
      }
    }
  };
}

function buildCacheKey(payload) {
  return stableStringify(payload);
}

function getCachedRecommendation(key) {
  const cached = recommendationCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    recommendationCache.delete(key);
    return null;
  }

  return cached.value;
}

function setCachedRecommendation(key, value, ttlMs = DEFAULT_CACHE_TTL_MS) {
  recommendationCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value
  });
}

function clearRecommendationCache() {
  recommendationCache.clear();
}

async function generateRecommendations({
  userId,
  email,
  healthGoals = {},
  dietaryConstraints = {},
  aiInsights = null,
  medicalReport = null,
  aiAdapterInput = null,
  maxResults = DEFAULT_MAX_RESULTS,
  refreshCache = false
}) {
  if (!userId) {
    throw new Error('userId is required');
  }

  const normalizedMaxResults = Math.max(1, Math.min(Number(maxResults) || DEFAULT_MAX_RESULTS, 20));
  const goalState = normalizeHealthGoals(healthGoals);
  const aiContext = await resolveAiRecommendationSignals({
    aiInsights,
    medicalReport,
    aiAdapterInput
  });
  const effectiveDietaryConstraints = {
    dietaryRequirementIds: normalizeIdList(dietaryConstraints.dietaryRequirementIds || dietaryConstraints.dietary_requirements),
    allergyIds: normalizeIdList(dietaryConstraints.allergyIds || dietaryConstraints.allergies)
  };

  const cacheKey = buildCacheKey({
    userId,
    email,
    goalState,
    effectiveDietaryConstraints,
    aiContext,
    normalizedMaxResults
  });

  if (!refreshCache) {
    const cached = getCachedRecommendation(cacheKey);
    if (cached) {
      return {
        ...cached,
        cache: {
          ...cached.cache,
          hit: true
        }
      };
    }
  }

  const [profileRows, preferences, recentRecipeIds, candidateRecipes] = await Promise.all([
    email ? getUserProfile(email) : Promise.resolve([]),
    fetchUserPreferences(userId),
    fetchRecentRecipeIds(userId).catch(() => []),
    fetchCandidateRecipes(100)
  ]);

  const profile = Array.isArray(profileRows) ? profileRows[0] || null : profileRows || null;
  const preferenceSummary = {
    dietaryRequirements: normalizeNameList(preferences?.dietary_requirements),
    allergies: normalizeNameList(preferences?.allergies),
    cuisines: normalizeNameList(preferences?.cuisines),
    dislikes: normalizeNameList(preferences?.dislikes),
    healthConditions: normalizeNameList(preferences?.health_conditions),
    spiceLevels: normalizeNameList(preferences?.spice_levels),
    cookingMethods: normalizeNameList(preferences?.cooking_methods)
  };

  const mergedGoalState = {
    ...goalState,
    prioritizeFiber: goalState.prioritizeFiber
      || aiContext.hints.prioritizeFiber === true
      || preferenceSummary.healthConditions.some((condition) => condition.includes('diabetes')),
    prioritizeProtein: goalState.prioritizeProtein || aiContext.hints.prioritizeProtein === true,
    limitSugar: goalState.limitSugar
      || aiContext.hints.limitSugar === true
      || preferenceSummary.healthConditions.some((condition) => condition.includes('diabetes')),
    limitSodium: goalState.limitSodium
      || preferenceSummary.healthConditions.some((condition) => condition.includes('hypertension') || condition.includes('blood pressure')),
    labels: unique([
      ...goalState.labels,
      ...(normalizeNameList(aiContext.hints.goalLabels))
    ])
  };

  const scoringContext = {
    preferredCuisineIds: normalizeIdList(aiContext.hints.preferredCuisineIds),
    preferredCookingMethodIds: normalizeIdList(aiContext.hints.preferredCookingMethodIds),
    preferredRecipeIds: normalizeIdList(aiContext.hints.preferredRecipeIds),
    excludedRecipeIds: normalizeIdList(aiContext.hints.excludedRecipeIds),
    recentRecipeIds,
    goalState: mergedGoalState,
    aiSource: aiContext.source,
    strategy: 'hybrid_rule_based',
    aiApplied: aiContext.source !== 'none',
    fallbackUsed: aiContext.fallbackUsed,
    adapterFailed: aiContext.adapterFailed,
    aiExplanationTags: normalizeNameList(aiContext.hints.explanationTags)
  };

  const recommendations = candidateRecipes
    .map((recipe) => scoreRecipe(recipe, scoringContext))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, normalizedMaxResults)
    .map((item, index) => ({
      rank: index + 1,
      ...item
    }));

  const response = {
    success: true,
    generatedAt: new Date().toISOString(),
    contractVersion: RECOMMENDATION_RESPONSE_VERSION,
    cache: {
      key: cacheKey,
      hit: false,
      ttlMs: DEFAULT_CACHE_TTL_MS
    },
    source: {
      strategy: 'hybrid_rule_based',
      ai: {
        source: aiContext.source,
        version: aiContext.version || AI_ADAPTER_VERSION,
        applied: aiContext.source !== 'none',
        fallbackUsed: aiContext.fallbackUsed,
        adapterFailed: aiContext.adapterFailed,
        warnings: aiContext.warnings || []
      }
    },
    input: {
      userId,
      healthGoals: mergedGoalState,
      dietaryConstraints: effectiveDietaryConstraints,
      maxResults: normalizedMaxResults
    },
    userContext: {
      profile,
      preferences: preferenceSummary,
      recentRecipeIds
    },
    recommendations
  };

  setCachedRecommendation(cacheKey, response);
  return response;
}

module.exports = {
  DEFAULT_CACHE_TTL_MS,
  RECOMMENDATION_RESPONSE_VERSION,
  clearRecommendationCache,
  generateRecommendations
};
