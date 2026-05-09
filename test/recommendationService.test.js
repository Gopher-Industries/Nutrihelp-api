const { expect } = require('chai');
const proxyquire = require('proxyquire');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

function createSupabaseStub({
  recentRecipeIds = [],
  recipes = [],
  dietaryRequirements = [],
  allergies = [],
  inserts = {}
} = {}) {
  return {
    from(table) {
      const insertedRows = inserts[table] || [];
      const query = {
        _insertRows: null,
        _inValues: null,
        select() {
          return this;
        },
        insert(rows) {
          this._insertRows = Array.isArray(rows) ? rows : [rows];
          return this;
        },
        single() {
          if (table === 'recommendation_lists') {
            return Promise.resolve({
              data: { id: 'list-1' },
              error: null
            });
          }

          return Promise.resolve({
            data: this._insertRows?.[0] || null,
            error: null
          });
        },
        eq() {
          return this;
        },
        in(_column, values) {
          this._inValues = Array.isArray(values) ? values : [];
          return this;
        },
        _execute() {
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

          if (table === 'dietary_requirements') {
            return Promise.resolve({
              data: dietaryRequirements.filter((row) => !this._inValues || this._inValues.includes(row.id)),
              error: null
            });
          }

          if (table === 'allergies') {
            return Promise.resolve({
              data: allergies.filter((row) => !this._inValues || this._inValues.includes(row.id)),
              error: null
            });
          }

          return Promise.resolve({ data: [], error: null });
        },
        limit() {
          return this._execute();
        },
        then(resolve, reject) {
          if (this._insertRows) {
            const rows = insertedRows.length ? insertedRows : this._insertRows;
            return Promise.resolve({
              data: rows,
              error: null
            }).then(resolve, reject);
          }
          return this._execute().then(resolve, reject);
        }
      };

      return query;
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
        cooking_methods: [{ id: 3, name: 'Grilled' }],
        health_context: {
          allergies: [],
          chronic_conditions: [{ referenceId: 7, status: 'managed', notes: 'monitor glucose' }],
          medications: [{
            name: 'Metformin',
            dosage: { amount: '500', unit: 'mg' },
            frequency: { timesPerDay: 2 }
          }]
        }
      }),
      '../model/getUserProfile': async () => ({ user_id: 5, email: 'user@example.com', first_name: 'Alex' }),
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
    expect(result.contractVersion).to.equal('recommendation-response-v2');
    expect(result.disclaimer).to.be.a('string').and.not.empty;
    expect(result.recommendations).to.have.length(2);
    expect(result.recommendations[0].recipeId).to.equal(1);
    expect(result.recommendations[0].safetyLevel).to.be.oneOf(['safe', 'caution']);
    expect(result.recommendations[0].explanation).to.be.an('object');
    expect(result.recommendations[0].explanation.reasons).to.be.an('array').and.not.empty;
    expect(
      result.recommendations[0].explanation.reasons.some((r) => r.tag === 'preferred_cuisine')
    ).to.equal(true);
    expect(result.recommendations[0].metadata.aiSource).to.equal('request');
    expect(result.source.ai.applied).to.equal(true);
    expect(result.source.strategy).to.equal('safety-aware-hybrid-v2');
    expect(result.blockedRecipes).to.be.an('array');
    expect(result.userContext.profile).to.deep.include({
      id: 5,
      email: 'user@example.com',
      firstName: 'Alex'
    });
    expect(result.userContext.preferences).to.deep.include({
      cuisines: ['mediterranean'],
      hasPreferences: true
    });
    expect(result.userContext.healthContext.chronic_conditions[0]).to.deep.include({
      referenceId: 7,
      name: 'Diabetes',
      status: 'managed'
    });
    expect(result.userContext.healthContext.medications[0]).to.deep.include({
      name: 'Metformin'
    });
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
      '../model/getUserProfile': async () => ({ user_id: 8, email: 'cache@example.com' }),
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

  it('persists recommendation snapshots when recommendation tables are available', async () => {
    const insertedTables = [];
    const service = proxyquire('../services/recommendationService', {
      '../dbConnection': {
        from(table) {
          insertedTables.push(table);
          return {
            _insertRows: null,
            select() {
              return this;
            },
            insert(rows) {
              this._insertRows = Array.isArray(rows) ? rows : [rows];
              return this;
            },
            single() {
              return Promise.resolve({ data: { id: 'list-123' }, error: null });
            },
            eq() {
              return this;
            },
            limit() {
              if (table === 'recipe_meal') {
                return Promise.resolve({ data: [], error: null });
              }

              if (table === 'recipes') {
                return Promise.resolve({
                  data: [{
                    id: 1,
                    recipe_name: 'Protein Bowl',
                    cuisine_id: 1,
                    cooking_method_id: 1,
                    calories: 420,
                    protein: 24,
                    fiber: 8,
                    sugar: 5,
                    sodium: 220,
                    fat: 11,
                    carbohydrates: 34,
                    allergy: false,
                    dislike: false
                  }],
                  error: null
                });
              }

              return Promise.resolve({ data: [], error: null });
            },
            then(resolve, reject) {
              if (table === 'recommendations') {
                return Promise.resolve({
                  data: [{ id: 'rec-1', recipe_id: 1, rank: 1 }],
                  error: null
                }).then(resolve, reject);
              }

              if (this._insertRows) {
                return Promise.resolve({
                  data: this._insertRows,
                  error: null
                }).then(resolve, reject);
              }

              return Promise.resolve({ data: [], error: null }).then(resolve, reject);
            }
          };
        }
      },
      '../model/fetchUserPreferences': async () => ({}),
      '../model/getUserProfile': async () => ({ user_id: 33, email: 'persist@example.com' }),
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

    const result = await service.generateRecommendations({
      userId: 33,
      email: 'persist@example.com',
      dietaryConstraints: {}
    });

    expect(result.persistence).to.deep.include({
      enabled: true,
      persisted: true,
      recommendationListId: 'list-123',
      resultCount: 1
    });
    expect(insertedTables).to.include.members([
      'recommendation_lists',
      'recommendations',
      'recommendation_results',
      'user_recommendations',
      'recommendation_history'
    ]);
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
      '../model/getUserProfile': async () => ({ user_id: 12, email: 'fallback@example.com' }),
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
    expect(result.recommendations[0].metadata.fallbackUsed).to.equal(true);
  });

  it('marks adapterFailed when AI adapter input is provided but no AI service is configured', async () => {
    const originalUrl = process.env.AI_RECOMMENDATION_URL;
    delete process.env.AI_RECOMMENDATION_URL;

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
      '../model/fetchUserPreferences': async () => null,
      '../model/getUserProfile': async () => ({ user_id: 12, email: 'fallback@example.com' }),
      './recommendationAiAdapter': proxyquire('../services/recommendationAiAdapter', {})
    });

    const result = await service.generateRecommendations({
      userId: 12,
      email: 'fallback@example.com',
      dietaryConstraints: {},
      aiAdapterInput: { user_id: 12 }
    });

    process.env.AI_RECOMMENDATION_URL = originalUrl;

    expect(result.source.ai.adapterFailed).to.equal(true);
    expect(result.source.ai.warnings).to.include('AI recommendation service is not configured');
  });

  it('propagates recent recipe fetch failures instead of silently treating them as empty history', async () => {
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
                return Promise.resolve({ data: null, error: new Error('recent recipe query failed') });
              }

              return Promise.resolve({ data: [], error: null });
            }
          };
        }
      },
      '../model/fetchUserPreferences': async () => ({}),
      '../model/getUserProfile': async () => ({ user_id: 8, email: 'cache@example.com' }),
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

    let caughtError = null;
    try {
      await service.generateRecommendations({ userId: 8, email: 'cache@example.com', dietaryConstraints: {} });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).to.be.an('error');
    expect(caughtError.message).to.equal('recent recipe query failed');
  });

  it('handles multiple medical reports and combines hint derivation signals', async () => {
    const service = proxyquire('../services/recommendationService', {
      '../dbConnection': createSupabaseStub({
        recipes: [{
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
        }]
      }),
      '../model/fetchUserPreferences': async () => ({}),
      '../model/getUserProfile': async () => ({ user_id: 5, email: 'user@example.com', first_name: 'Alex' }),
      './recommendationAiAdapter': proxyquire('../services/recommendationAiAdapter', {})
    });

    const result = await service.generateRecommendations({
      userId: 5,
      email: 'user@example.com',
      dietaryConstraints: {},
      medicalReport: [
        { diabetes_prediction: { diabetes: true } },
        { obesity_prediction: { obesity_level: 'Overweight' } }
      ]
    });

    expect(result.source.ai.source).to.equal('medical_report');
    expect(result.input.healthGoals.limitSugar).to.equal(true);
    expect(result.input.healthGoals.prioritizeFiber).to.equal(true);
    expect(result.source.ai.warnings).to.deep.equal([]);
  });

  it('hard-blocks allergy matches and surfaces them in blockedRecipes', async () => {
    const service = proxyquire('../services/recommendationService', {
      '../dbConnection': createSupabaseStub({
        recipes: [
          {
            id: 1,
            recipe_name: 'Chicken Peanut Satay',
            cuisine_id: 5,
            cooking_method_id: 2,
            calories: 520,
            protein: 24,
            fiber: 4,
            sugar: 8,
            sodium: 400,
            fat: 18,
            carbohydrates: 36,
            allergy: false,
            dislike: false
          },
          {
            id: 2,
            recipe_name: 'Chicken Quinoa Bowl',
            cuisine_id: 3,
            cooking_method_id: 2,
            calories: 520,
            protein: 30,
            fiber: 8,
            sugar: 6,
            sodium: 320,
            fat: 14,
            carbohydrates: 40,
            allergy: false,
            dislike: false
          }
        ]
      }),
      '../model/fetchUserPreferences': async () => ({
        allergies: [{ id: 11, name: 'Peanut' }],
        health_context: {
          allergies: [{ referenceId: 11, severity: 'severe' }],
          chronic_conditions: [],
          medications: []
        }
      }),
      '../model/getUserProfile': async () => ({ user_id: 9, email: 'allergic@example.com' }),
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
    const result = await service.generateRecommendations({
      userId: 9,
      email: 'allergic@example.com',
      dietaryConstraints: {}
    });

    const returnedIds = result.recommendations.map((r) => r.recipeId);
    expect(returnedIds).to.not.include(1);
    expect(result.blockedRecipes).to.have.length(1);
    expect(result.blockedRecipes[0].recipeId).to.equal(1);
    expect(result.blockedRecipes[0].blockers).to.include('peanut');
    expect(result.summary.totalBlocked).to.equal(1);
  });

  it('flags medication-food interactions as cautions with a disclaimer', async () => {
    const service = proxyquire('../services/recommendationService', {
      '../dbConnection': createSupabaseStub({
        recipes: [
          {
            id: 7,
            recipe_name: 'Grapefruit Avocado Salad',
            cuisine_id: 2,
            cooking_method_id: 4,
            calories: 320,
            protein: 6,
            fiber: 7,
            sugar: 12,
            sodium: 220,
            fat: 18,
            carbohydrates: 26,
            allergy: false,
            dislike: false
          }
        ]
      }),
      '../model/fetchUserPreferences': async () => ({
        allergies: [],
        health_conditions: [{ id: 4, name: 'High Cholesterol' }],
        health_context: {
          allergies: [],
          chronic_conditions: [{ referenceId: 4, status: 'managed' }],
          medications: [{ name: 'Atorvastatin', active: true }]
        }
      }),
      '../model/getUserProfile': async () => ({ user_id: 14, email: 'statin@example.com' }),
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
    const result = await service.generateRecommendations({
      userId: 14,
      email: 'statin@example.com',
      dietaryConstraints: {}
    });

    expect(result.recommendations).to.have.length(1);
    const rec = result.recommendations[0];
    expect(rec.safetyLevel).to.equal('caution');
    expect(rec.triggeredMedicationRuleIds).to.include('statin_grapefruit');
    expect(rec.explanation.safetyNotes[0].disclaimer).to.equal(true);
    expect(result.downgradedRecipes.map((r) => r.recipeId)).to.include(7);
  });

  it('applies dietaryConstraints IDs to scoring and surfaces them in the response context', async () => {
    const service = proxyquire('../services/recommendationService', {
      '../dbConnection': createSupabaseStub({
        recipes: [
          {
            id: 1,
            recipe_name: 'Tofu Veggie Bowl',
            description: 'A vegan high protein bowl',
            ingredients: ['tofu', 'broccoli', 'quinoa'],
            cuisine_id: 3,
            cooking_method_id: 2,
            calories: 430,
            protein: 24,
            fiber: 8,
            sugar: 5,
            sodium: 310,
            fat: 12,
            carbohydrates: 28,
            allergy: false,
            dislike: false
          },
          {
            id: 2,
            recipe_name: 'Creamy Chicken Pasta',
            description: 'Pasta with cream sauce and chicken',
            ingredients: ['pasta', 'cream', 'chicken'],
            cuisine_id: 3,
            cooking_method_id: 2,
            calories: 690,
            protein: 20,
            fiber: 3,
            sugar: 7,
            sodium: 640,
            fat: 24,
            carbohydrates: 72,
            allergy: false,
            dislike: false
          }
        ],
        dietaryRequirements: [
          { id: 1, name: 'Vegan' },
          { id: 2, name: 'High Protein' }
        ]
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
      '../model/getUserProfile': async () => ({ user_id: 15, email: 'dietary@example.com' }),
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
    const result = await service.generateRecommendations({
      userId: 15,
      email: 'dietary@example.com',
      dietaryConstraints: {
        dietaryRequirementIds: [1, 2]
      }
    });

    expect(result.recommendations[0].recipeId).to.equal(1);
    expect(result.userContext.preferences.dietaryRequirements).to.include('vegan');
    expect(result.userContext.preferences.dietaryRequirements).to.include('high protein');
    expect(result.recommendations[0].explanation.reasons.map((r) => r.tag)).to.include('dietary_vegan');
    expect(result.recommendations[0].explanation.reasons.map((r) => r.tag)).to.include('dietary_high_protein');
  });

  it('uses allergy IDs from dietaryConstraints to block unsafe recipes even without stored user allergies', async () => {
    const service = proxyquire('../services/recommendationService', {
      '../dbConnection': createSupabaseStub({
        recipes: [
          {
            id: 1,
            recipe_name: 'Peanut Noodle Salad',
            description: 'Cold noodle salad with crushed peanuts',
            ingredients: ['noodles', 'peanuts', 'lime'],
            cuisine_id: 2,
            cooking_method_id: 1,
            calories: 510,
            protein: 16,
            fiber: 5,
            sugar: 6,
            sodium: 420,
            fat: 20,
            carbohydrates: 58,
            allergy: false,
            dislike: false
          }
        ],
        allergies: [
          { id: 11, name: 'Peanut' }
        ]
      }),
      '../model/fetchUserPreferences': async () => ({
        dietary_requirements: [],
        allergies: [],
        cuisines: [],
        dislikes: [],
        health_conditions: [],
        spice_levels: [],
        cooking_methods: [],
        health_context: { allergies: [], chronic_conditions: [], medications: [] }
      }),
      '../model/getUserProfile': async () => ({ user_id: 16, email: 'request-allergy@example.com' }),
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
    const result = await service.generateRecommendations({
      userId: 16,
      email: 'request-allergy@example.com',
      dietaryConstraints: {
        allergyIds: [11]
      }
    });

    expect(result.recommendations).to.have.length(0);
    expect(result.blockedRecipes).to.have.length(1);
    expect(result.blockedRecipes[0].blockers).to.include('peanut');
  });
});
