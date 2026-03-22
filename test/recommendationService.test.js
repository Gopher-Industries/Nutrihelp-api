const { expect } = require('chai');
const proxyquire = require('proxyquire');

function createSupabaseStub({ recentRecipeIds = [], recipes = [] } = {}) {
  return {
    from(table) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        limit() {
          if (table === 'recipe_meal') {
            return Promise.resolve({
              data: recentRecipeIds.map((recipeId) => ({ recipe_id: recipeId })),
              error: null
            });
          }

          if (table === 'recipes') {
            return Promise.resolve({
              data: recipes,
              error: null
            });
          }

          return Promise.resolve({ data: [], error: null });
        }
      };
    }
  };
}

describe('Recommendation Service', () => {
  it('ranks recommendations using preferences and AI insight metadata', async () => {
    const service = proxyquire('../services/recommendationService', {
      '../dbConnection': createSupabaseStub({
        recentRecipeIds: [2],
        recipes: [
          {
            id: 1,
            recipe_name: 'Protein Bowl',
            cuisine_id: 10,
            cooking_method_id: 3,
            calories: 520,
            protein: 32,
            fiber: 9,
            sugar: 6,
            sodium: 250,
            fat: 14,
            carbohydrates: 40,
            allergy: false,
            dislike: false
          },
          {
            id: 2,
            recipe_name: 'Sweet Pasta',
            cuisine_id: 11,
            cooking_method_id: 4,
            calories: 700,
            protein: 12,
            fiber: 2,
            sugar: 20,
            sodium: 900,
            fat: 18,
            carbohydrates: 80,
            allergy: false,
            dislike: false
          }
        ]
      }),
      '../model/fetchUserPreferences': async () => ({
        dietary_requirements: [{ id: 1, name: 'High Protein' }],
        allergies: [],
        cuisines: [{ id: 10, name: 'Mediterranean' }],
        dislikes: [],
        health_conditions: [{ id: 7, name: 'Diabetes' }],
        spice_levels: [],
        cooking_methods: [{ id: 3, name: 'Grilled' }]
      }),
      '../model/getUserProfile': async () => ([{ user_id: 5, email: 'user@example.com', first_name: 'Alex' }]),
      './recommendationAiAdapter': {
        AI_ADAPTER_VERSION: 'v1',
        resolveAiRecommendationSignals: async () => ({
          source: 'request',
          version: 'v1',
          fallbackUsed: false,
          adapterFailed: false,
          warnings: [],
          hints: {
            preferredCuisineIds: [10],
            preferredCookingMethodIds: [],
            preferredRecipeIds: [1],
            excludedRecipeIds: [],
            goalLabels: ['blood sugar management'],
            prioritizeProtein: false,
            prioritizeFiber: true,
            limitSugar: true,
            limitSodium: false,
            explanationTags: ['ranking_signal']
          }
        })
      }
    });

    const result = await service.generateRecommendations({
      userId: 5,
      email: 'user@example.com',
      healthGoals: { prioritizeProtein: true, targetCalories: 500 },
      aiInsights: { preferredCuisineIds: [10], preferredRecipeIds: [1] },
      maxResults: 2
    });

    expect(result.success).to.equal(true);
    expect(result.contractVersion).to.equal('recommendation-response-v1');
    expect(result.recommendations).to.have.length(2);
    expect(result.recommendations[0].recipeId).to.equal(1);
    expect(result.recommendations[0].explanation).to.include('preferred cuisine');
    expect(result.recommendations[0].metadata.sourceTags).to.include('request');
    expect(result.source.ai.applied).to.equal(true);
  });

  it('returns cached results for repeated requests', async () => {
    let recipeQueryCount = 0;
    const service = proxyquire('../services/recommendationService', {
      '../dbConnection': {
        from(table) {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            limit() {
              if (table === 'recipe_meal') {
                return Promise.resolve({ data: [], error: null });
              }

              recipeQueryCount += 1;
              return Promise.resolve({
                data: [{
                  id: 1,
                  recipe_name: 'Cached Meal',
                  cuisine_id: 1,
                  cooking_method_id: 1,
                  calories: 450,
                  protein: 20,
                  fiber: 5,
                  sugar: 5,
                  sodium: 300,
                  fat: 10,
                  carbohydrates: 35,
                  allergy: false,
                  dislike: false
                }],
                error: null
              });
            }
          };
        }
      },
      '../model/fetchUserPreferences': async () => ({
        dietary_requirements: [],
        allergies: [],
        cuisines: [],
        dislikes: [],
        health_conditions: [],
        spice_levels: [],
        cooking_methods: []
      }),
      '../model/getUserProfile': async () => ([{ user_id: 8, email: 'cache@example.com' }]),
      './recommendationAiAdapter': {
        AI_ADAPTER_VERSION: 'v1',
        resolveAiRecommendationSignals: async () => ({
          source: 'none',
          version: 'v1',
          fallbackUsed: true,
          adapterFailed: false,
          warnings: [],
          hints: {}
        })
      }
    });

    service.clearRecommendationCache();

    const first = await service.generateRecommendations({ userId: 8, email: 'cache@example.com' });
    const second = await service.generateRecommendations({ userId: 8, email: 'cache@example.com' });

    expect(first.cache.hit).to.equal(false);
    expect(second.cache.hit).to.equal(true);
    expect(recipeQueryCount).to.equal(1);
  });

  it('falls back cleanly when the AI adapter reports failure', async () => {
    const service = proxyquire('../services/recommendationService', {
      '../dbConnection': createSupabaseStub({
        recipes: [{
          id: 4,
          recipe_name: 'Fallback Soup',
          cuisine_id: 1,
          cooking_method_id: 2,
          calories: 350,
          protein: 14,
          fiber: 7,
          sugar: 4,
          sodium: 250,
          fat: 8,
          carbohydrates: 30,
          allergy: false,
          dislike: false
        }]
      }),
      '../model/fetchUserPreferences': async () => ({
        dietary_requirements: [],
        allergies: [],
        cuisines: [],
        dislikes: [],
        health_conditions: [],
        spice_levels: [],
        cooking_methods: []
      }),
      '../model/getUserProfile': async () => ([{ user_id: 12, email: 'fallback@example.com' }]),
      './recommendationAiAdapter': {
        AI_ADAPTER_VERSION: 'v1',
        resolveAiRecommendationSignals: async () => ({
          source: 'none',
          version: 'v1',
          fallbackUsed: true,
          adapterFailed: true,
          warnings: ['AI recommendation service error: 503'],
          hints: {}
        })
      }
    });

    const result = await service.generateRecommendations({
      userId: 12,
      email: 'fallback@example.com',
      aiAdapterInput: { user_id: 12 }
    });

    expect(result.success).to.equal(true);
    expect(result.source.ai.fallbackUsed).to.equal(true);
    expect(result.source.ai.adapterFailed).to.equal(true);
    expect(result.source.ai.warnings).to.include('AI recommendation service error: 503');
    expect(result.recommendations[0].metadata.explanationMetadata.fallbackUsed).to.equal(true);
  });
});
