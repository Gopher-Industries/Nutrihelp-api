/**
 * services/recommendationService.js
 *
 * Top-level recommendation service. Fetches candidate recipes, gathers
 * the user's profile, preferences, structured health context, recent
 * meal history, and AI hints, then delegates all scoring / filtering /
 * explanation work to the safety-aware scoring engine in
 * ./recommendationScoring.
 *
 * Response shape is documented in technical_docs/Recommendation
 * Intelligence Contract.md (contractVersion: recommendation-response-v2).
 */

const supabase = require('../dbConnection');
const fetchUserPreferences = require('../model/fetchUserPreferences');
const getUserProfile = require('../model/getUserProfile');
const {
  buildCanonicalProfile,
  buildPreferenceSummary,
  normalizeNameList
} = require('./userProfileService');
const {
  AI_ADAPTER_VERSION,
  resolveAiRecommendationSignals
} = require('./recommendationAiAdapter');
const { buildStructuredHealthContext } = require('./userPreferencesService');
const scoringEngine = require('./recommendationScoring');

const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const RECOMMENDATION_RESPONSE_VERSION = 'recommendation-response-v2';
const DEFAULT_DISCLAIMER = 'Recommendations are informational and do not replace guidance from a healthcare professional.';
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

function normalizeIdList(items) {
  const src = Array.isArray(items) ? items : [];
  return unique(src.map((item) => {
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

function normalizeLookupRow(row) {
  if (!row) return null;
  if (typeof row === 'string') {
    const normalized = row.trim().toLowerCase();
    return normalized ? { id: null, name: normalized } : null;
  }
  if (typeof row === 'object') {
    const name = row.name != null ? String(row.name).trim().toLowerCase() : null;
    const id = Number.isInteger(row.id) ? row.id : null;
    if (!name) return null;
    return { id, name };
  }
  return null;
}

async function resolveLookupNames(table, ids, fallbackRows = []) {
  const normalizedIds = normalizeIdList(ids);
  if (!normalizedIds.length) {
    return [];
  }

  const resolvedById = new Map(
    (Array.isArray(fallbackRows) ? fallbackRows : [])
      .map(normalizeLookupRow)
      .filter(Boolean)
      .filter((row) => row.id != null)
      .map((row) => [row.id, row.name])
  );

  const unresolvedIds = normalizedIds.filter((id) => !resolvedById.has(id));

  if (unresolvedIds.length) {
    const { data, error } = await supabase
      .from(table)
      .select('id, name')
      .in('id', unresolvedIds);

    if (error) {
      throw error;
    }

    for (const row of data || []) {
      const normalized = normalizeLookupRow(row);
      if (normalized && normalized.id != null) {
        resolvedById.set(normalized.id, normalized.name);
      }
    }
  }

  return unique(normalizedIds.map((id) => resolvedById.get(id)));
}

function mergeAllergyContext(primaryAllergies = [], requestedAllergyNames = []) {
  const existingNames = new Set(
    (Array.isArray(primaryAllergies) ? primaryAllergies : [])
      .map((item) => item?.name)
      .filter(Boolean)
      .map((name) => String(name).trim().toLowerCase())
  );

  const merged = [...(Array.isArray(primaryAllergies) ? primaryAllergies : [])];

  for (const name of normalizeNameList(requestedAllergyNames)) {
    if (existingNames.has(name)) continue;
    existingNames.add(name);
    merged.push({
      referenceId: null,
      name,
      severity: 'unknown',
      notes: 'Applied from request dietaryConstraints'
    });
  }

  return merged;
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

async function fetchCandidateRecipes(limit = 100) {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, recipe_name, description, ingredients, cuisine_id, cooking_method_id, total_servings, preparation_time, calories, fat, carbohydrates, protein, fiber, sodium, sugar, allergy, dislike')
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
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
  recommendationCache.set(key, { expiresAt: Date.now() + ttlMs, value });
}

function clearRecommendationCache() {
  recommendationCache.clear();
}

function mergeGoalState(goalState, aiHints, healthContext) {
  const chronicNames = healthContext?.normalized_summary?.chronicConditionNames || [];
  const hasDiabetes = chronicNames.some((condition) => condition.includes('diabetes'));
  const hasHypertension = chronicNames.some((condition) => condition.includes('hypertension') || condition.includes('blood pressure'));

  return {
    ...goalState,
    prioritizeFiber: goalState.prioritizeFiber || aiHints.prioritizeFiber === true || hasDiabetes,
    prioritizeProtein: goalState.prioritizeProtein || aiHints.prioritizeProtein === true,
    limitSugar: goalState.limitSugar || aiHints.limitSugar === true || hasDiabetes,
    limitSodium: goalState.limitSodium || aiHints.limitSodium === true || hasHypertension,
    labels: unique([
      ...goalState.labels,
      ...normalizeNameList(aiHints.goalLabels)
    ])
  };
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
  const aiContext = await resolveAiRecommendationSignals({ aiInsights, medicalReport, aiAdapterInput });
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
    normalizedMaxResults,
    contractVersion: RECOMMENDATION_RESPONSE_VERSION
  });

  if (!refreshCache) {
    const cached = getCachedRecommendation(cacheKey);
    if (cached) {
      return { ...cached, cache: { ...cached.cache, hit: true } };
    }
  }

  const [profileRows, preferences, recentRecipeIds, candidateRecipes] = await Promise.all([
    email ? getUserProfile({ email }) : Promise.resolve(null),
    fetchUserPreferences(userId),
    fetchRecentRecipeIds(userId),
    fetchCandidateRecipes(100)
  ]);

  const profile = buildCanonicalProfile(profileRows);
  const preferenceData = preferences && typeof preferences === 'object' ? preferences : {};
  const preferenceSummary = buildPreferenceSummary(preferenceData);
  const structuredHealthContext = buildStructuredHealthContext(preferenceData);
  const [requestedDietaryRequirementNames, requestedAllergyNames] = await Promise.all([
    resolveLookupNames('dietary_requirements', effectiveDietaryConstraints.dietaryRequirementIds, preferenceData.dietary_requirements),
    resolveLookupNames('allergies', effectiveDietaryConstraints.allergyIds, preferenceData.allergies)
  ]);
  const mergedGoalState = mergeGoalState(goalState, aiContext.hints, structuredHealthContext);
  const mergedAllergies = mergeAllergyContext(structuredHealthContext.allergies, requestedAllergyNames);
  const activeDietaryRequirements = unique([
    ...preferenceSummary.dietaryRequirements,
    ...requestedDietaryRequirementNames
  ]);

  const scoringContext = {
    preferredCuisineIds: normalizeIdList(aiContext.hints.preferredCuisineIds),
    preferredCookingMethodIds: normalizeIdList(aiContext.hints.preferredCookingMethodIds),
    preferredRecipeIds: normalizeIdList(aiContext.hints.preferredRecipeIds),
    excludedRecipeIds: normalizeIdList(aiContext.hints.excludedRecipeIds),
    recentRecipeIds,
    dislikes: preferenceSummary.dislikes,
    allergies: mergedAllergies,
    dietaryRequirements: activeDietaryRequirements,
    conditionNames: structuredHealthContext.normalized_summary.chronicConditionNames,
    medications: structuredHealthContext.medications,
    goalState: mergedGoalState,
    aiSource: aiContext.source,
    aiFallbackUsed: aiContext.fallbackUsed,
    aiAdapterFailed: aiContext.adapterFailed,
    aiExplanationTags: normalizeNameList(aiContext.hints.explanationTags)
  };

  const { recommendations, blockedRecipes, downgradedRecipes } = scoringEngine.rankRecipes(
    candidateRecipes,
    scoringContext,
    { maxResults: normalizedMaxResults }
  );

  const response = {
    success: true,
    generatedAt: new Date().toISOString(),
    contractVersion: RECOMMENDATION_RESPONSE_VERSION,
    disclaimer: DEFAULT_DISCLAIMER,
    cache: {
      key: cacheKey,
      hit: false,
      ttlMs: DEFAULT_CACHE_TTL_MS
    },
    source: {
      strategy: scoringEngine.STRATEGY_ID,
      scoringContractVersion: scoringEngine.CONTRACT_VERSION,
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
      preferences: {
        ...preferenceSummary,
        dietaryRequirements: activeDietaryRequirements
      },
      healthContext: {
        ...structuredHealthContext,
        allergies: mergedAllergies
      },
      recentRecipeIds
    },
    recommendations,
    blockedRecipes,
    downgradedRecipes,
    summary: {
      totalCandidates: candidateRecipes.length,
      totalBlocked: blockedRecipes.length,
      totalDowngraded: downgradedRecipes.length,
      totalReturned: recommendations.length
    }
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
