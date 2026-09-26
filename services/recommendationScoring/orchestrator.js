/**
 * orchestrator.js
 *
 * Top-level entry point for the safety-aware scoring engine. Composes
 * the allergyFilter, conditionAdjuster, medicationGuard, nutritionBalance
 * and preferenceMatcher modules, produces a single normalised recipe
 * recommendation, and surfaces all the reasons / warnings / safety notes
 * the frontend needs to render explainable results.
 *
 * The orchestrator never throws — it always returns a normalised object
 * so callers can simply sort and slice.
 */

const allergyFilter = require('./allergyFilter');
const conditionAdjuster = require('./conditionAdjuster');
const medicationGuard = require('./medicationGuard');
const nutritionBalance = require('./nutritionBalance');
const preferenceMatcher = require('./preferenceMatcher');
const reasonBuilder = require('./reasonBuilder');

const STRATEGY_ID = 'safety-aware-hybrid-v2';
const CONTRACT_VERSION = 'recommendation-scoring-v2';

function scoreRecipe(recipe, context = {}) {
  // ---- Layer 1: hard safety filter ---------------------------------------
  const allergyResult = allergyFilter.evaluate(recipe, {
    allergies: context.allergies
  });

  if (allergyResult.blocked) {
    return {
      recipeId: recipe.id,
      title: recipe.recipe_name,
      blocked: true,
      safetyLevel: 'blocked',
      score: 0,
      reasonCode: 'allergy_blocked',
      blockers: allergyResult.blockers,
      severity: allergyResult.severity,
      explanation: reasonBuilder.buildExplanation({
        reasons: [],
        warnings: [{
          tag: 'allergy_blocked',
          message: `Hidden from your list — matches allergy: ${allergyResult.blockers.join(', ')}.`,
          severity: 'high'
        }],
        safetyNotes: allergyResult.notes.map((message) => ({
          tag: 'allergy_blocked',
          message,
          severity: 'high',
          disclaimer: true
        })),
        fallback: 'Hidden for allergy safety.'
      }),
      metadata: {
        cuisineId: recipe.cuisine_id,
        cookingMethodId: recipe.cooking_method_id,
        strategy: STRATEGY_ID,
        nutrition: nutritionBalance.evaluate(recipe).breakdown
      }
    };
  }

  // ---- Layer 2: preference signals --------------------------------------
  const prefs = preferenceMatcher.evaluate(recipe, {
    preferredCuisineIds: context.preferredCuisineIds,
    preferredCookingMethodIds: context.preferredCookingMethodIds,
    preferredRecipeIds: context.preferredRecipeIds,
    excludedRecipeIds: context.excludedRecipeIds,
    recentRecipeIds: context.recentRecipeIds,
    dislikes: context.dislikes,
    dietaryRequirements: context.dietaryRequirements,
    goalState: context.goalState
  });

  // ---- Layer 3: condition alignment -------------------------------------
  const conditionResult = conditionAdjuster.evaluate(recipe, {
    conditionNames: context.conditionNames
  });

  // ---- Layer 4: medication guards ---------------------------------------
  const medResult = medicationGuard.evaluate(recipe, {
    medications: context.medications
  });

  // ---- Layer 5: nutritional balance -------------------------------------
  const balance = nutritionBalance.evaluate(recipe);

  // ---- Roll up ----------------------------------------------------------
  const totalReasons = [...prefs.reasons, ...conditionResult.reasons, ...balance.reasons];
  const totalWarnings = [...prefs.warnings, ...conditionResult.warnings, ...balance.warnings];
  const totalSafetyNotes = [...medResult.safetyNotes];

  const aiSignalBonus = context.aiSource && context.aiSource !== 'none' ? 2 : 0;

  const subtotals = {
    preference: prefs.score,
    condition: conditionResult.score,
    nutrition: balance.score,
    aiSignal: aiSignalBonus,
    medicationPenalty: medResult.safetyNotes.reduce((total, note) => {
      if (note?.severity === 'high') return total - 6;
      if (note?.severity === 'warn') return total - 3;
      return total;
    }, 0)
  };

  const score = subtotals.preference
    + subtotals.condition
    + subtotals.nutrition
    + subtotals.aiSignal
    + subtotals.medicationPenalty;

  const explanation = reasonBuilder.buildExplanation({
    reasons: totalReasons,
    warnings: totalWarnings,
    safetyNotes: totalSafetyNotes,
    fallback: 'Balanced choice based on available nutrition data.'
  });

  const safetyLevel = reasonBuilder.decideSafetyLevel({
    blocked: false,
    warnings: totalWarnings,
    safetyNotes: totalSafetyNotes
  });

  return {
    recipeId: recipe.id,
    title: recipe.recipe_name,
    blocked: false,
    safetyLevel,
    score,
    breakdown: subtotals,
    explanation,
    matchedSignals: prefs.matchedSignals,
    appliedConditions: conditionResult.appliedConditions,
    triggeredMedicationRuleIds: medResult.triggeredRuleIds,
    metadata: {
      cuisineId: recipe.cuisine_id,
      cookingMethodId: recipe.cooking_method_id,
      preparationTime: recipe.preparation_time ?? null,
      totalServings: recipe.total_servings ?? null,
      nutrition: balance.breakdown,
      strategy: STRATEGY_ID,
      aiSource: context.aiSource || 'none',
      aiApplied: (context.aiSource && context.aiSource !== 'none') || false,
      fallbackUsed: context.aiFallbackUsed === true,
      adapterFailed: context.aiAdapterFailed === true
    }
  };
}

/**
 * Rank a full list of candidate recipes.
 * @returns {{ recommendations, blockedRecipes, downgradedRecipes }}
 */
function rankRecipes(recipes, context = {}, { maxResults = 5 } = {}) {
  const scored = (recipes || []).map((recipe) => scoreRecipe(recipe, context));

  const blockedRecipes = scored
    .filter((r) => r.blocked)
    .map((r) => ({
      recipeId: r.recipeId,
      title: r.title,
      reason: r.reasonCode,
      blockers: r.blockers,
      severity: r.severity
    }));

  const visible = scored
    .filter((r) => !r.blocked)
    .sort((a, b) => b.score - a.score);

  const recommendations = visible
    .slice(0, maxResults)
    .map((item, index) => ({ rank: index + 1, ...item }));

  const downgradedRecipes = visible
    .filter((r) => r.safetyLevel === 'caution')
    .slice(0, 5)
    .map((r) => ({
      recipeId: r.recipeId,
      title: r.title,
      safetyLevel: r.safetyLevel,
      warnings: r.explanation.warnings,
      safetyNotes: r.explanation.safetyNotes
    }));

  return {
    recommendations,
    blockedRecipes,
    downgradedRecipes
  };
}

module.exports = {
  STRATEGY_ID,
  CONTRACT_VERSION,
  scoreRecipe,
  rankRecipes
};
