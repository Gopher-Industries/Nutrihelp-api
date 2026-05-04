const { expect } = require('chai');
const {
  allergyFilter,
  conditionAdjuster,
  medicationGuard,
  nutritionBalance,
  preferenceMatcher,
  reasonBuilder,
  rankRecipes,
  scoreRecipe,
  STRATEGY_ID
} = require('../services/recommendationScoring');

const balancedRecipe = {
  id: 1,
  recipe_name: 'Chicken Quinoa Bowl',
  cuisine_id: 3,
  cooking_method_id: 2,
  calories: 520,
  protein: 32,
  fiber: 8,
  sugar: 6,
  sodium: 380,
  fat: 16,
  carbohydrates: 42,
  allergy: false,
  dislike: false
};

const peanutSatay = {
  id: 2,
  recipe_name: 'Chicken Peanut Satay',
  cuisine_id: 5,
  cooking_method_id: 1,
  calories: 600,
  protein: 28,
  fiber: 3,
  sugar: 12,
  sodium: 780,
  fat: 22,
  carbohydrates: 38,
  allergy: false,
  dislike: false
};

const grapefruitSalad = {
  id: 3,
  recipe_name: 'Grapefruit Avocado Salad',
  cuisine_id: 2,
  cooking_method_id: 4,
  calories: 310,
  protein: 6,
  fiber: 7,
  sugar: 14,
  sodium: 220,
  fat: 18,
  carbohydrates: 28,
  allergy: false,
  dislike: false
};

const sugaryDessert = {
  id: 4,
  recipe_name: 'Chocolate Lava Cake',
  cuisine_id: 2,
  cooking_method_id: 3,
  calories: 780,
  protein: 8,
  fiber: 2,
  sugar: 48,
  sodium: 220,
  fat: 32,
  carbohydrates: 96,
  allergy: false,
  dislike: false
};

describe('recommendationScoring — allergyFilter', () => {
  it('hard blocks a recipe that matches a peanut allergy', () => {
    const result = allergyFilter.evaluate(peanutSatay, {
      allergies: [{ name: 'Peanut', severity: 'severe' }]
    });
    expect(result.blocked).to.equal(true);
    expect(result.blockers).to.include('peanut');
    expect(result.severity).to.equal('severe');
    expect(result.notes[0]).to.include('peanut');
  });

  it('blocks when the recipe carries the legacy allergy flag', () => {
    const flagged = { ...balancedRecipe, allergy: true };
    const result = allergyFilter.evaluate(flagged, { allergies: [] });
    expect(result.blocked).to.equal(true);
    expect(result.blockers).to.include('database_allergy_flag');
  });

  it('does not block recipes that do not match any allergy terms', () => {
    const result = allergyFilter.evaluate(balancedRecipe, {
      allergies: [{ name: 'Shellfish', severity: 'moderate' }]
    });
    expect(result.blocked).to.equal(false);
    expect(result.blockers).to.deep.equal([]);
  });

  it('expands dairy aliases so cheese-only dishes are still caught', () => {
    const cheesePizza = { ...balancedRecipe, id: 10, recipe_name: 'Four Cheese Pizza' };
    const result = allergyFilter.evaluate(cheesePizza, {
      allergies: [{ name: 'Dairy', severity: 'moderate' }]
    });
    expect(result.blocked).to.equal(true);
    expect(result.blockers).to.include('dairy');
  });
});

describe('recommendationScoring — conditionAdjuster', () => {
  it('rewards low-sugar + high-fibre recipes when diabetes is present', () => {
    const result = conditionAdjuster.evaluate(balancedRecipe, {
      conditionNames: ['diabetes']
    });
    expect(result.score).to.be.greaterThan(0);
    const tags = result.reasons.map((r) => r.tag);
    expect(tags).to.include('diabetes_low_sugar');
    expect(tags).to.include('diabetes_high_fiber');
    expect(result.appliedConditions).to.include('diabetes');
  });

  it('penalises high-sugar dishes for diabetic users and surfaces a warning', () => {
    const result = conditionAdjuster.evaluate(sugaryDessert, {
      conditionNames: ['type 2 diabetes']
    });
    expect(result.score).to.be.lessThan(0);
    const warnTags = result.warnings.map((w) => w.tag);
    expect(warnTags).to.include('diabetes_high_sugar');
  });

  it('flags high-sodium dishes for hypertensive users', () => {
    const saltyStew = { ...balancedRecipe, sodium: 1400 };
    const result = conditionAdjuster.evaluate(saltyStew, {
      conditionNames: ['hypertension']
    });
    expect(result.warnings.map((w) => w.tag)).to.include('hypertension_high_sodium');
    expect(result.score).to.be.lessThan(0);
  });

  it('flags suspected gluten for celiac users', () => {
    const breadBowl = { ...balancedRecipe, recipe_name: 'Creamy Bread Bowl' };
    const result = conditionAdjuster.evaluate(breadBowl, {
      conditionNames: ['celiac']
    });
    expect(result.warnings.map((w) => w.tag)).to.include('celiac_gluten_risk');
  });
});

describe('recommendationScoring — medicationGuard', () => {
  it('emits a high-severity safety note when MAOI + aged cheese combine', () => {
    const agedCheeseDish = { ...balancedRecipe, recipe_name: 'Aged Cheddar Mac Bowl' };
    const result = medicationGuard.evaluate(agedCheeseDish, {
      medications: [{ name: 'Phenelzine', active: true }]
    });
    expect(result.triggeredRuleIds).to.include('maoi_tyramine');
    expect(result.safetyNotes[0].severity).to.equal('high');
    expect(result.safetyNotes[0].disclaimer).to.equal(true);
  });

  it('flags grapefruit + statin as a caution', () => {
    const result = medicationGuard.evaluate(grapefruitSalad, {
      medications: [{ name: 'Atorvastatin', active: true }]
    });
    expect(result.triggeredRuleIds).to.include('statin_grapefruit');
    expect(result.safetyNotes[0].severity).to.equal('warn');
  });

  it('ignores inactive medications', () => {
    const result = medicationGuard.evaluate(grapefruitSalad, {
      medications: [{ name: 'Atorvastatin', active: false }]
    });
    expect(result.triggeredRuleIds).to.deep.equal([]);
    expect(result.safetyNotes).to.deep.equal([]);
  });

  it('stays silent when there is no medication-food overlap', () => {
    const result = medicationGuard.evaluate(balancedRecipe, {
      medications: [{ name: 'Atorvastatin', active: true }]
    });
    expect(result.triggeredRuleIds).to.deep.equal([]);
  });
});

describe('recommendationScoring — nutritionBalance', () => {
  it('rewards a well-balanced recipe with a positive score', () => {
    const result = nutritionBalance.evaluate(balancedRecipe);
    expect(result.score).to.be.greaterThan(10);
    const tags = result.reasons.map((r) => r.tag);
    expect(tags).to.include('balanced_protein');
    expect(tags).to.include('balanced_fiber');
  });

  it('penalises high sugar and high sodium meals', () => {
    const junk = { ...sugaryDessert, sodium: 1500 };
    const result = nutritionBalance.evaluate(junk);
    const warnTags = result.warnings.map((w) => w.tag);
    expect(warnTags).to.include('sugar_high');
    expect(warnTags).to.include('sodium_high');
  });
});

describe('recommendationScoring — preferenceMatcher', () => {
  it('rewards AI preferred recipes and preferred cuisines', () => {
    const result = preferenceMatcher.evaluate(balancedRecipe, {
      preferredCuisineIds: [3],
      preferredRecipeIds: [1],
      goalState: { prioritizeProtein: true, prioritizeFiber: true }
    });
    expect(result.score).to.be.greaterThan(0);
    expect(result.matchedSignals).to.include('preferred_cuisine');
    expect(result.matchedSignals).to.include('ai_preferred_recipe');
    expect(result.matchedSignals).to.include('goal_high_protein');
  });

  it('penalises recent recipes for variety', () => {
    const result = preferenceMatcher.evaluate(balancedRecipe, {
      recentRecipeIds: [1],
      goalState: {}
    });
    expect(result.score).to.be.lessThan(0);
    expect(result.reasons.map((r) => r.tag)).to.include('recent_meal_penalty');
  });

  it('downgrades dislikes but does not hard block them', () => {
    const disliked = { ...balancedRecipe, dislike: true };
    const result = preferenceMatcher.evaluate(disliked, { goalState: {} });
    expect(result.score).to.be.lessThan(0);
    expect(result.warnings.map((w) => w.tag)).to.include('user_disliked');
  });
});

describe('recommendationScoring — reasonBuilder', () => {
  it('orders reasons by weight and warnings by severity', () => {
    const explanation = reasonBuilder.buildExplanation({
      reasons: [
        { tag: 'a', message: 'A', weight: 2 },
        { tag: 'b', message: 'B', weight: 10 }
      ],
      warnings: [
        { tag: 'w1', message: 'w1', severity: 'info' },
        { tag: 'w2', message: 'w2', severity: 'high' }
      ]
    });
    expect(explanation.reasons[0].tag).to.equal('b');
    expect(explanation.warnings[0].tag).to.equal('w2');
    expect(explanation.disclaimer).to.be.a('string').and.not.empty;
  });

  it('picks a safe/caution/blocked safety level based on inputs', () => {
    expect(reasonBuilder.decideSafetyLevel({ blocked: true })).to.equal('blocked');
    expect(reasonBuilder.decideSafetyLevel({ warnings: [{ severity: 'high' }] })).to.equal('caution');
    expect(reasonBuilder.decideSafetyLevel({ warnings: [], safetyNotes: [] })).to.equal('safe');
  });
});

describe('recommendationScoring — orchestrator.scoreRecipe', () => {
  it('returns a blocked result with zero score when the allergy filter fires', () => {
    const result = scoreRecipe(peanutSatay, {
      allergies: [{ name: 'peanut', severity: 'severe' }],
      goalState: {}
    });
    expect(result.blocked).to.equal(true);
    expect(result.safetyLevel).to.equal('blocked');
    expect(result.score).to.equal(0);
    expect(result.explanation.warnings[0].tag).to.equal('allergy_blocked');
  });

  it('returns a safe result for a clean, well-balanced recipe', () => {
    const result = scoreRecipe(balancedRecipe, {
      allergies: [],
      preferredCuisineIds: [3],
      goalState: { prioritizeProtein: true, prioritizeFiber: true },
      aiSource: 'request'
    });
    expect(result.blocked).to.equal(false);
    expect(result.safetyLevel).to.equal('safe');
    expect(result.score).to.be.greaterThan(20);
    expect(result.explanation.summary).to.be.a('string').and.not.empty;
    expect(result.metadata.strategy).to.equal(STRATEGY_ID);
  });

  it('escalates a recipe to caution when medication-food rules trigger', () => {
    const result = scoreRecipe(grapefruitSalad, {
      allergies: [],
      medications: [{ name: 'Atorvastatin', active: true }],
      goalState: {}
    });
    expect(result.blocked).to.equal(false);
    expect(result.safetyLevel).to.equal('caution');
    expect(result.triggeredMedicationRuleIds).to.include('statin_grapefruit');
    expect(result.explanation.safetyNotes[0].disclaimer).to.equal(true);
    expect(result.breakdown.medicationPenalty).to.equal(-3);
  });

  it('handles a conflicted case — safe but demoted by condition warnings', () => {
    const result = scoreRecipe(sugaryDessert, {
      allergies: [],
      conditionNames: ['diabetes'],
      goalState: {}
    });
    expect(result.blocked).to.equal(false);
    expect(result.safetyLevel).to.equal('caution');
    expect(result.breakdown.condition).to.be.lessThan(0);
    expect(result.explanation.warnings.map((w) => w.tag)).to.include('diabetes_high_sugar');
  });
});

describe('recommendationScoring — orchestrator.rankRecipes', () => {
  it('ranks safe options above caution options and filters blocked ones out', () => {
    const input = [balancedRecipe, sugaryDessert, grapefruitSalad, peanutSatay];
    const ctx = {
      allergies: [{ name: 'peanut', severity: 'severe' }],
      medications: [{ name: 'Atorvastatin', active: true }],
      conditionNames: ['diabetes'],
      preferredCuisineIds: [3],
      goalState: { prioritizeProtein: true, prioritizeFiber: true, limitSugar: true }
    };

    const { recommendations, blockedRecipes, downgradedRecipes } = rankRecipes(input, ctx, { maxResults: 5 });

    const returnedIds = recommendations.map((r) => r.recipeId);
    expect(returnedIds).to.not.include(2); // peanut blocked
    expect(blockedRecipes.map((r) => r.recipeId)).to.deep.equal([2]);

    expect(recommendations[0].recipeId).to.equal(1); // balanced Chicken Quinoa Bowl on top
    expect(recommendations[0].safetyLevel).to.equal('safe');

    const downgradedIds = downgradedRecipes.map((r) => r.recipeId);
    expect(downgradedIds).to.include(3); // grapefruit + statin caution
    expect(downgradedIds).to.include(4); // sugary dessert vs diabetes
  });

  it('returns an empty recommendation list without throwing when no candidates are provided', () => {
    const { recommendations, blockedRecipes, downgradedRecipes } = rankRecipes([], {});
    expect(recommendations).to.deep.equal([]);
    expect(blockedRecipes).to.deep.equal([]);
    expect(downgradedRecipes).to.deep.equal([]);
  });

  it('assigns sequential ranks to returned recommendations', () => {
    const { recommendations } = rankRecipes(
      [balancedRecipe, grapefruitSalad, sugaryDessert],
      { allergies: [], goalState: {} },
      { maxResults: 3 }
    );
    expect(recommendations.map((r) => r.rank)).to.deep.equal([1, 2, 3]);
  });
});
