/**
 * services/recommendationScoring/index.js
 *
 * Public entry point for the safety-aware scoring engine. Importers
 * should use this module rather than reaching into sibling files so
 * refactors stay cheap.
 */

const allergyFilter = require('./allergyFilter');
const conditionAdjuster = require('./conditionAdjuster');
const medicationGuard = require('./medicationGuard');
const nutritionBalance = require('./nutritionBalance');
const preferenceMatcher = require('./preferenceMatcher');
const reasonBuilder = require('./reasonBuilder');
const orchestrator = require('./orchestrator');

module.exports = {
  allergyFilter,
  conditionAdjuster,
  medicationGuard,
  nutritionBalance,
  preferenceMatcher,
  reasonBuilder,
  rankRecipes: orchestrator.rankRecipes,
  scoreRecipe: orchestrator.scoreRecipe,
  STRATEGY_ID: orchestrator.STRATEGY_ID,
  CONTRACT_VERSION: orchestrator.CONTRACT_VERSION
};
