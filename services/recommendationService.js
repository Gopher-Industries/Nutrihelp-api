const fetchUserPreferences = require('../model/fetchUserPreferences');
const getUserProfile = require('../model/getUserProfile');
const recommendationRepository = require('../repositories/mobile/recommendationRepository');
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
  const normalizedItems = Array.isArray(items) ? items : [];
  return unique(normalizedItems.map((item) => {
    if (!item) return null;
    if (typeof item === 'string') return item.trim().toLowerCase();
    return item.name ? String(item.name).trim().toLowerCase() : null;
  }));
}

function normalizeIdList(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  return unique(normalizedItems.map((item) => {
    if (item == null) return null;
    if (typeof item === 'number') return Number.isInteger(item) && item > 0 ? item : null;
    if (typeof item === 'string' && /^[1-9]\d*$/.test(item.trim())) return Number(item.trim());
    if (typeof item === 'object' && item.id != null) {
      if (typeof item.id === 'number') return Number.isInteger(item.id) && item.id > 0 ? item.id : null;
      if (typeof item.id === 'string' && /^[1-9]\d*$/.test(item.id.trim())) return Number(item.id.trim());
    }
    return null;
  }));
}

function safeNumber(value) {
  if (value == null || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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
  const rows = await recommendationRepository.getRecentRecipeIdsByUserId(userId, 20);
  return unique((rows || []).map((row) => row.recipe_id));
}

async function fetchCandidateRecipes(limit = 50) {
  return recommendationRepository.getCandidateRecipes(limit);
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
  const protein = safeNumber(recipe.protein);
  const fiber = safeNumber(recipe.fiber);
  const sugar = safeNumber(recipe.sugar);
  const sodium = safeNumber(recipe.sodium);
  const calories = safeNumber(recipe.calories);
  const fat = safeNumber(recipe.fat);
  const carbohydrates = safeNumber(recipe.carbohydrates);

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

  if (context.goalState.prioritizeProtein && protein != null && protein >= 15) {
    score += 12;
    reasons.push('supports higher protein intake');
    matchedSignals.push('high_protein');
  }

  if (context.goalState.prioritizeFiber && fiber != null && fiber >= 5) {
    score += 12;
    reasons.push('supports higher fiber intake');
    matchedSignals.push('high_fiber');
  }

  if (context.goalState.limitSugar) {
    if (sugar != null && sugar <= 10) {
      score += 12;
      reasons.push('fits lower sugar preference');
      matchedSignals.push('low_sugar');
    } else if (sugar != null) {
      score -= 10;
    }
  }

  if (context.goalState.limitSodium) {
    if (sodium != null && sodium <= 400) {
      score += 12;
      reasons.push('fits lower sodium preference');
      matchedSignals.push('low_sodium');
    } else if (sodium != null) {
      score -= 10;
    }
  }

  if (context.goalState.targetCalories != null && calories != null) {
    const delta = Math.abs(calories - context.goalState.targetCalories);
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
        calories,
        protein,
        fiber,
        sugar,
        sodium,
        fat,
        carbohydrates
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

  const normalizedMaxResults = maxResults == null
    ? DEFAULT_MAX_RESULTS
    : Math.max(1, Math.min(maxResults, 20));
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
    fetchRecentRecipeIds(userId),
    fetchCandidateRecipes(100)
  ]);

  const profile = Array.isArray(profileRows) ? profileRows[0] || null : profileRows || null;
  const preferenceData = preferences && typeof preferences === 'object' ? preferences : {};
  const preferenceSummary = {
    dietaryRequirements: normalizeNameList(preferenceData.dietary_requirements),
    allergies: normalizeNameList(preferenceData.allergies),
    cuisines: normalizeNameList(preferenceData.cuisines),
    dislikes: normalizeNameList(preferenceData.dislikes),
    healthConditions: normalizeNameList(preferenceData.health_conditions),
    spiceLevels: normalizeNameList(preferenceData.spice_levels),
    cookingMethods: normalizeNameList(preferenceData.cooking_methods)
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
