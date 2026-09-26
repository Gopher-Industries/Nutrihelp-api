const { supabaseService } = require('./supabaseClient');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

const RECIPE_TABLE = 'recipe_library';
const IMPORT_QUEUE_TABLE = 'recipe_library_import_queue';

const PUBLIC_VISIBILITIES = ['public', 'community'];
const PUBLISHED_STATUSES = ['reviewed', 'published'];
const TRASH_REASON_DEFAULT = 'Moved to Trash';
const LEGACY_TRASH_MARKER_PREFIX = `${TRASH_REASON_DEFAULT} [legacy]`;
const ALLOWED_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'other']);
const LEGACY_OTHER_MEAL_TYPES = new Set([
  'other',
  'others',
  'snack',
  'snacks',
  'dessert',
  'desserts',
  'drink',
  'drinks',
  'beverage',
  'beverages',
]);
const ALLOWED_DIFFICULTY = new Set(['easy', 'medium', 'hard']);
const ALLOWED_SPICE = new Set(['none', 'mild', 'medium', 'hot']);
const ENRICHMENT_PROMPT_VERSION = 'recipe_library_v1_2026_05_07';
const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
const EDITABLE_IMPORT_QUEUE_STATUSES = new Set(['pending', 'queued', 'failed', 'rejected', 'enriched']);
const CANCELABLE_IMPORT_QUEUE_STATUSES = new Set(['pending', 'queued', 'failed', 'rejected', 'enriching', 'enriched']);
let recipeTrashColumnsSupportedCache = null;

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function makeSlug(name) {
  const base = slugify(name) || 'recipe';
  return `${base}-${Date.now().toString(36)}`;
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeJsonArray(value, options = {}) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
  } catch (_error) {
    // Fall through to line-based parsing for textarea input.
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (options.asInstruction ? line.replace(/^\d+[.)]\s*/, '') : { name: line }));
}

function normalizeMealType(value, fallback = 'breakfast') {
  const mealType = cleanText(value).toLowerCase();
  if (ALLOWED_MEAL_TYPES.has(mealType)) return mealType;
  if (LEGACY_OTHER_MEAL_TYPES.has(mealType)) return 'other';
  return fallback;
}

function normalizeLegacyQueueMealType(value, fallback = null) {
  const mealType = cleanText(value).toLowerCase();
  if (mealType === 'breakfast' || mealType === 'lunch' || mealType === 'dinner') return mealType;
  if (mealType === 'snack' || mealType === 'snacks') return 'snack';
  if (mealType === 'dessert' || mealType === 'desserts') return 'dessert';
  if (mealType === 'drink' || mealType === 'drinks' || mealType === 'beverage' || mealType === 'beverages') {
    return 'drink';
  }
  return fallback;
}

function isMealTypeConstraintViolation(error) {
  const code = String(error?.code || '').trim();
  const constraint = String(error?.constraint || '').trim().toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '23514' &&
    (constraint.includes('recipe_library_import_queue_meal_type_check') ||
      message.includes('recipe_library_import_queue_meal_type_check'))
  );
}

function normalizeEnum(value, allowedSet) {
  const normalized = cleanText(value).toLowerCase();
  return allowedSet.has(normalized) ? normalized : null;
}

function isMissingColumnError(error, columnName) {
  if (!error) return false;
  if (String(error.code || '').trim() === '42703') return true;
  const message = String(error.message || '').toLowerCase();
  return Boolean(columnName && message.includes(`${String(columnName).toLowerCase()} does not exist`));
}

function encodeLegacyTrashMarker(snapshot = {}) {
  const normalized = {
    visibility: snapshot.visibility ?? null,
    is_published: Boolean(snapshot.is_published),
    data_status: snapshot.data_status ?? null,
    moderation_status: snapshot.moderation_status ?? null,
    moderation_reason: snapshot.moderation_reason ?? null,
    submitted_at: snapshot.submitted_at ?? null,
    reviewed_at: snapshot.reviewed_at ?? null,
    reviewed_by: snapshot.reviewed_by ?? null,
    published_at: snapshot.published_at ?? null,
  };
  return `${LEGACY_TRASH_MARKER_PREFIX}|${Buffer.from(JSON.stringify(normalized), 'utf8').toString('base64')}`;
}

function decodeLegacyTrashMarker(value) {
  const raw = cleanText(value);
  if (!raw.startsWith(`${LEGACY_TRASH_MARKER_PREFIX}|`)) return null;
  const encoded = raw.slice(`${LEGACY_TRASH_MARKER_PREFIX}|`.length);
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function isLegacyRecipeTrashed(recipe) {
  const reason = cleanText(recipe?.moderation_reason);
  if (!reason) return false;
  if (reason.startsWith(LEGACY_TRASH_MARKER_PREFIX)) return true;
  return reason.startsWith(TRASH_REASON_DEFAULT);
}

async function supportsRecipeTrashColumns() {
  if (typeof recipeTrashColumnsSupportedCache === 'boolean') return recipeTrashColumnsSupportedCache;

  const { error } = await supabaseService.from(RECIPE_TABLE).select('id,trashed_at').limit(1);
  if (!error) {
    recipeTrashColumnsSupportedCache = true;
    return true;
  }

  if (isMissingColumnError(error, 'trashed_at')) {
    recipeTrashColumnsSupportedCache = false;
    return false;
  }

  throw error;
}

function extractJsonObject(rawText) {
  const cleaned = String(rawText || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : cleaned;
  return JSON.parse(jsonText);
}

function buildEnrichmentPrompt(queueRow) {
  return `You are a nutrition recipe data enrichment engine for an Australian health meal planning app.

Input dish:
- dish_name: "${queueRow.dish_name}"
- meal_type_hint: "${queueRow.meal_type || ''}"
- cuisine_hint: "${queueRow.cuisine_hint || ''}"
- cooking_method_hint: "${queueRow.cooking_method_hint || ''}"

Return strict JSON only. Do not include markdown.

Rules:
- Make the recipe realistic for home cooking in Australia.
- Nutrition is per serving.
- Use metric units.
- Ingredients must be specific and measurable.
- Instructions must be 6 to 10 clear steps.
- Do not claim medical certainty.
- If unsure about allergens or nutrition, provide conservative estimates.
- Keep recipe suitable for a general meal catalog, not a clinical prescription.
- Use lowercase enum values.

JSON shape:
{
  "recipe_name": "string",
  "dish_name": "string",
  "display_name": "string",
  "description": "string",
  "meal_type": "breakfast|lunch|dinner|other",
  "cuisine_name": "string",
  "cooking_method_name": "string",
  "difficulty": "easy|medium|hard",
  "spice_level": "none|mild|medium|hot",
  "prep_time_minutes": 10,
  "cook_time_minutes": 20,
  "servings": 2,
  "serving_size": "1 bowl, about 450 g",
  "ingredients": [{"name": "string", "quantity": 120, "unit": "g|ml|tbsp|tsp|piece|cup", "notes": "string"}],
  "instructions": ["string"],
  "equipment": ["string"],
  "tips": ["string"],
  "storage_instructions": "string",
  "reheating_instructions": "string",
  "dietary_tags": ["high-protein"],
  "health_tags": ["balanced"],
  "allergens": ["gluten"],
  "avoid_for_conditions": ["hypertension"],
  "suitable_goals": ["maintenance"],
  "nutrition": {
    "calories": 520,
    "protein": 32,
    "fat": 18,
    "saturated_fat": 5,
    "carbohydrates": 58,
    "fiber": 8,
    "sugar": 7,
    "sodium": 780,
    "potassium": 650,
    "calcium": 180,
    "iron": 3.5,
    "vitamin_a": 120,
    "vitamin_c": 25
  },
  "ai_confidence": 0.78,
  "quality_notes": "string"
}`;
}

async function generateRecipeEnrichment(queueRow) {
  const prompt = buildEnrichmentPrompt(queueRow);

  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return {
        parsed: extractJsonObject(result.response.text()),
        provider: 'gemini',
        model: 'gemini-2.5-flash',
      };
    } catch (error) {
      if (!process.env.GROQ_API_KEY) throw error;
      console.warn('Recipe library Gemini enrichment failed, falling back to Groq:', error.message);
    }
  }

  if (process.env.GROQ_API_KEY) {
    const groqModel =
      process.env.RECIPE_ENRICHMENT_GROQ_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      model: groqModel,
      messages: [
        { role: 'system', content: 'Return only valid JSON. No markdown. No explanations.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    return {
      parsed: extractJsonObject(response.choices[0].message.content),
      provider: 'groq',
      model: groqModel,
    };
  }

  const error = new Error('AI enrichment is not configured. Set GEMINI_API_KEY or GROQ_API_KEY.');
  error.statusCode = 503;
  throw error;
}

function validateEnrichmentPayload(aiPayload) {
  if (!cleanText(aiPayload.recipe_name)) throw new Error('AI response missing recipe_name');
  if (!Array.isArray(aiPayload.ingredients) || aiPayload.ingredients.length < 3) {
    throw new Error('AI response must include at least 3 ingredients');
  }
  if (!Array.isArray(aiPayload.instructions) || aiPayload.instructions.length < 5) {
    throw new Error('AI response must include at least 5 instructions');
  }
  if (!normalizeMealType(aiPayload.meal_type, null)) {
    throw new Error('AI response has invalid meal_type');
  }
}

function getNestedObject(input = {}, keys = []) {
  for (const key of keys) {
    const value = input?.[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  return null;
}

function unwrapEnrichmentPayload(aiPayload = {}) {
  const payload = normalizeObject(aiPayload) || {};
  const nested = getNestedObject(payload, [
    'recipe',
    'recipe_data',
    'recipeData',
    'recipe_details',
    'recipeDetails',
    'data',
    'result',
    'enriched_payload',
  ]);
  return nested && Object.keys(nested).length ? nested : payload;
}

function normalizeEnrichmentPayload(aiPayload = {}, queueRow = {}) {
  const payload = unwrapEnrichmentPayload(aiPayload);
  const nutrition =
    normalizeObject(payload.nutrition) ||
    normalizeObject(payload.nutrition_per_serving) ||
    normalizeObject(payload.nutritionPerServing) ||
    normalizeObject(payload.nutritional_info) ||
    normalizeObject(payload.nutritionalInfo) ||
    {};
  const pick = (...keys) => {
    for (const key of keys) {
      if (payload[key] !== undefined) return payload[key];
    }
    return undefined;
  };
  const pickNumber = (key) => numberOrNull(payload[key] ?? nutrition[key]);

  return {
    ...payload,
    recipe_name: cleanText(pick('recipe_name', 'recipeName', 'name', 'title')) || cleanText(queueRow.dish_name) || null,
    dish_name: cleanText(pick('dish_name', 'dishName')) || cleanText(queueRow.dish_name) || null,
    meal_type: normalizeMealType(pick('meal_type', 'mealType') || queueRow.meal_type, null),
    ingredients: normalizeJsonArray(pick('ingredients', 'recipe_ingredients', 'recipeIngredients')),
    instructions: normalizeJsonArray(pick('instructions', 'steps', 'method'), { asInstruction: true })
      .map((line) => cleanText(line))
      .filter(Boolean),
    servings: numberOrNull(pick('servings', 'total_servings', 'totalServings')),
    calories: pickNumber('calories'),
    protein: pickNumber('protein'),
    fat: pickNumber('fat'),
    saturated_fat: pickNumber('saturated_fat'),
    carbohydrates: pickNumber('carbohydrates'),
    fiber: pickNumber('fiber'),
    sugar: pickNumber('sugar'),
    sodium: pickNumber('sodium'),
    potassium: pickNumber('potassium'),
    calcium: pickNumber('calcium'),
    iron: pickNumber('iron'),
    vitamin_a: pickNumber('vitamin_a'),
    vitamin_c: pickNumber('vitamin_c'),
  };
}

function detectQuotaPauseReason(error) {
  const statusCode = Number(error?.statusCode || error?.status || error?.response?.status || 0);
  const parts = [
    cleanText(error?.message),
    cleanText(error?.code),
    cleanText(error?.name),
    cleanText(error?.error?.message),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const quotaSignals = [
    'rate limit',
    'rate_limit',
    'too many requests',
    'quota',
    'resource exhausted',
    'insufficient_quota',
    'tokens per day',
    'daily limit',
    'billing',
  ];

  const hasSignal = quotaSignals.some((signal) => parts.includes(signal));
  if (statusCode === 429 || hasSignal) {
    return cleanText(error?.message) || 'AI quota/rate limit reached';
  }

  return null;
}

function normalizeLookupName(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findLookupId(items, name) {
  const wanted = normalizeLookupName(name);
  if (!wanted) return null;
  const exact = items.find((item) => normalizeLookupName(item.name) === wanted);
  if (exact) return exact.id;
  const partial = items.find((item) => {
    const candidate = normalizeLookupName(item.name);
    return candidate.includes(wanted) || wanted.includes(candidate);
  });
  return partial?.id || null;
}

async function getReferenceLookups() {
  const [cuisines, cookingMethods] = await Promise.all([
    supabaseService.from('cuisines').select('id, name'),
    supabaseService.from('cooking_methods').select('id, name'),
  ]);

  if (cuisines.error) throw cuisines.error;
  if (cookingMethods.error) throw cookingMethods.error;

  return {
    cuisines: cuisines.data || [],
    cookingMethods: cookingMethods.data || [],
  };
}

function getUnsplashAccessKey() {
  return (
    process.env.UNSPLASH_ACCESS_KEY ||
    process.env.REACT_APP_UNSPLASH_ACCESS_KEY ||
    process.env.UNSPLASH_API_KEY ||
    ''
  );
}

async function fetchDishImageMetadata(dishName, cuisineName) {
  const accessKey = getUnsplashAccessKey();
  if (!accessKey) return null;

  const query = [dishName, cuisineName, 'food dish'].filter(Boolean).join(' ');
  const params = new URLSearchParams({
    query,
    per_page: '5',
    orientation: 'landscape',
    content_filter: 'high',
  });

  const response = await fetch(`${UNSPLASH_API_URL}?${params.toString()}`, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!response.ok) return null;
  const data = await response.json();
  const photo = data?.results?.[0];
  if (!photo?.urls?.regular) return null;

  return {
    image_url: photo.urls.regular,
    image_original_url: photo.urls.full || photo.urls.raw || photo.urls.regular,
    image_source: 'Unsplash',
    image_source_url: photo.links?.html || null,
    image_attribution: photo.user?.name || null,
    image_license: 'Unsplash License',
    image_confidence: 0.7,
    image_fetched_at: new Date().toISOString(),
  };
}

function buildRecipePayload(input = {}, defaults = {}) {
  const recipeName = cleanText(input.recipe_name || input.recipeName || input.name);
  const dishName = cleanText(input.dish_name || input.dishName || recipeName);

  if (!recipeName) {
    const error = new Error('recipe_name is required');
    error.statusCode = 400;
    throw error;
  }

  const nutrition = input.nutrition && typeof input.nutrition === 'object' ? input.nutrition : {};

  return {
    ...defaults,
    slug: input.slug ? slugify(input.slug) : defaults.slug || makeSlug(recipeName),
    recipe_name: recipeName,
    dish_name: dishName || recipeName,
    display_name: cleanText(input.display_name || input.displayName) || null,
    description: cleanText(input.description) || null,
    meal_type: normalizeMealType(input.meal_type || input.mealType || defaults.meal_type),
    cuisine_id: numberOrNull(input.cuisine_id || input.cuisineId),
    cuisine_name_snapshot: cleanText(input.cuisine_name || input.cuisineName || input.cuisine_name_snapshot) || null,
    cooking_method_id: numberOrNull(input.cooking_method_id || input.cookingMethodId),
    cooking_method_name_snapshot:
      cleanText(input.cooking_method_name || input.cookingMethodName || input.cooking_method_name_snapshot) || null,
    difficulty: normalizeEnum(input.difficulty, ALLOWED_DIFFICULTY),
    spice_level: normalizeEnum(input.spice_level || input.spiceLevel, ALLOWED_SPICE),
    prep_time_minutes: numberOrNull(input.prep_time_minutes || input.prepTimeMinutes),
    cook_time_minutes: numberOrNull(input.cook_time_minutes || input.cookTimeMinutes),
    servings: numberOrNull(input.servings || input.total_servings || input.totalServings),
    serving_size: cleanText(input.serving_size || input.servingSize) || null,
    ingredients: normalizeJsonArray(input.ingredients),
    instructions: normalizeJsonArray(input.instructions, { asInstruction: true }),
    equipment: normalizeArray(input.equipment),
    tips: normalizeArray(input.tips),
    storage_instructions: cleanText(input.storage_instructions || input.storageInstructions) || null,
    reheating_instructions: cleanText(input.reheating_instructions || input.reheatingInstructions) || null,
    notes: cleanText(input.notes) || null,
    dietary_tags: normalizeArray(input.dietary_tags || input.dietaryTags),
    health_tags: normalizeArray(input.health_tags || input.healthTags),
    allergens: normalizeArray(input.allergens),
    avoid_for_conditions: normalizeArray(input.avoid_for_conditions || input.avoidForConditions),
    suitable_goals: normalizeArray(input.suitable_goals || input.suitableGoals),
    calories: numberOrNull(input.calories ?? nutrition.calories),
    protein: numberOrNull(input.protein ?? nutrition.protein),
    fat: numberOrNull(input.fat ?? nutrition.fat),
    saturated_fat: numberOrNull(input.saturated_fat ?? nutrition.saturated_fat),
    carbohydrates: numberOrNull(input.carbohydrates ?? nutrition.carbohydrates),
    fiber: numberOrNull(input.fiber ?? nutrition.fiber),
    sugar: numberOrNull(input.sugar ?? nutrition.sugar),
    sodium: numberOrNull(input.sodium ?? nutrition.sodium),
    potassium: numberOrNull(input.potassium ?? nutrition.potassium),
    calcium: numberOrNull(input.calcium ?? nutrition.calcium),
    iron: numberOrNull(input.iron ?? nutrition.iron),
    vitamin_a: numberOrNull(input.vitamin_a ?? nutrition.vitamin_a),
    vitamin_c: numberOrNull(input.vitamin_c ?? nutrition.vitamin_c),
    image_url: cleanText(input.image_url || input.imageUrl) || null,
    image_original_url: cleanText(input.image_original_url || input.imageOriginalUrl) || null,
    image_source: cleanText(input.image_source || input.imageSource) || null,
    image_source_url: cleanText(input.image_source_url || input.imageSourceUrl) || null,
    image_attribution: cleanText(input.image_attribution || input.imageAttribution) || null,
    image_license: cleanText(input.image_license || input.imageLicense) || null,
    image_confidence: numberOrNull(input.image_confidence || input.imageConfidence),
  };
}

function buildTrashSnapshot(recipe) {
  return {
    visibility: recipe?.visibility ?? null,
    is_published: Boolean(recipe?.is_published),
    data_status: recipe?.data_status ?? null,
    moderation_status: recipe?.moderation_status ?? null,
    moderation_reason: recipe?.moderation_reason ?? null,
    submitted_at: recipe?.submitted_at ?? null,
    reviewed_at: recipe?.reviewed_at ?? null,
    reviewed_by: recipe?.reviewed_by ?? null,
    published_at: recipe?.published_at ?? null,
  };
}

function assertRecipeNotTrashed(recipe) {
  if (!recipe?.trashed_at && !isLegacyRecipeTrashed(recipe)) return;
  const error = new Error('Trashed recipes must be recovered before editing');
  error.statusCode = 409;
  throw error;
}

function assertRecipeTrashed(recipe) {
  if (recipe?.trashed_at || isLegacyRecipeTrashed(recipe)) return;
  const error = new Error('Only trashed recipes can be recovered or permanently deleted');
  error.statusCode = 409;
  throw error;
}

function applyFilters(query, filters = {}) {
  if (filters.meal_type) {
    const normalizedMealType = normalizeMealType(filters.meal_type, null);
    if (normalizedMealType) query = query.eq('meal_type', normalizedMealType);
  }
  if (filters.cuisine_id) query = query.eq('cuisine_id', Number(filters.cuisine_id));
  if (filters.cooking_method_id) query = query.eq('cooking_method_id', Number(filters.cooking_method_id));
  if (filters.search) {
    const search = cleanText(filters.search).replace(/[%]/g, '');
    if (search) query = query.or(`recipe_name.ilike.%${search}%,dish_name.ilike.%${search}%`);
  }
  return query;
}

async function runListQuery(baseQuery, filters = {}) {
  const limit = Math.min(Number(filters.limit) || 50, 300);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const { data, error, count } = await applyFilters(baseQuery, filters)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { items: data || [], count: count ?? data?.length ?? 0 };
}

async function listPublishedRecipes(filters = {}) {
  const hasTrashColumns = await supportsRecipeTrashColumns();
  let query = supabaseService
    .from(RECIPE_TABLE)
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .in('visibility', PUBLIC_VISIBILITIES)
    .in('data_status', PUBLISHED_STATUSES);

  if (hasTrashColumns) query = query.is('trashed_at', null);

  if (filters.scope === 'catalog') query = query.eq('visibility', 'public');
  if (filters.scope === 'community') query = query.eq('visibility', 'community');

  return runListQuery(query, filters);
}

async function listAdminRecipes(filters = {}) {
  const hasTrashColumns = await supportsRecipeTrashColumns();
  let query = supabaseService.from(RECIPE_TABLE).select('*', { count: 'exact' });
  if (filters.scope !== 'all' && !filters.visibility) {
    query = query.in('visibility', ['public', 'private']);
  }
  if (hasTrashColumns) {
    if (filters.scope === 'trash') {
      query = query.not('trashed_at', 'is', null);
    } else if (filters.scope !== 'all') {
      query = query.is('trashed_at', null);
    }
  }
  if (filters.visibility) query = query.eq('visibility', cleanText(filters.visibility));
  if (filters.data_status) query = query.eq('data_status', cleanText(filters.data_status));
  if (filters.moderation_status) query = query.eq('moderation_status', cleanText(filters.moderation_status));
  const result = await runListQuery(query, filters);
  if (hasTrashColumns || filters.scope === 'all') return result;

  const isTrashScope = filters.scope === 'trash';
  const items = (result.items || []).filter((row) =>
    isTrashScope ? isLegacyRecipeTrashed(row) : !isLegacyRecipeTrashed(row)
  );
  return { items, count: items.length };
}

async function listMyRecipes(userId, filters = {}) {
  const hasTrashColumns = await supportsRecipeTrashColumns();
  let query = supabaseService
    .from(RECIPE_TABLE)
    .select('*', { count: 'exact' })
    .eq('owner_user_id', Number(userId));

  if (hasTrashColumns) query = query.is('trashed_at', null);
  const result = await runListQuery(query, filters);
  if (hasTrashColumns) return result;
  const items = (result.items || []).filter((row) => !isLegacyRecipeTrashed(row));
  return { items, count: items.length };
}

async function listAddMealRecipes(userId, filters = {}) {
  return listPublishedRecipes({
    ...filters,
    scope: 'catalog',
  });
}

async function getRecipeById(id) {
  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .select('*')
    .eq('id', Number(id))
    .single();

  if (error) throw error;
  return data;
}

function canUserReadRecipe(recipe, user) {
  if (!recipe) return false;
  if ((recipe.trashed_at || isLegacyRecipeTrashed(recipe)) && user?.role !== 'admin') return false;
  if (recipe.is_published && PUBLIC_VISIBILITIES.includes(recipe.visibility)) return true;
  if (user?.role === 'admin') return true;
  return Number(recipe.owner_user_id) === Number(user?.userId);
}

function assertOwnerOrAdmin(recipe, user) {
  if (user?.role === 'admin') return;
  if (Number(recipe?.owner_user_id) === Number(user?.userId)) return;
  const error = new Error('You can only update your own recipe');
  error.statusCode = 403;
  throw error;
}

async function createPrivateRecipe(input, userId) {
  const payload = buildRecipePayload(input, {
    owner_user_id: Number(userId),
    visibility: 'private',
    source: 'user_created',
    is_published: false,
    data_status: 'user_private',
    moderation_status: 'not_required',
  });

  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function saveLegacyUserRecipeToLibrary(recipe, legacyRecipeId) {
  const payload = buildRecipePayload(
    {
      ...recipe,
      ingredients: (recipe.ingredients?.id || []).map((id, index) => ({
        ingredient_id: id,
        quantity: recipe.ingredients?.quantity?.[index] ?? null,
      })),
      total_servings: recipe.total_servings,
    },
    {
      owner_user_id: Number(recipe.user_id),
      legacy_recipe_id: Number(legacyRecipeId),
      visibility: 'private',
      source: 'legacy_migration',
      is_published: false,
      data_status: 'user_private',
      moderation_status: 'not_required',
    }
  );

  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function updateRecipe(id, input, user) {
  const existing = await getRecipeById(id);
  assertOwnerOrAdmin(existing, user);
  assertRecipeNotTrashed(existing);

  const payload = buildRecipePayload(
    {
      ...existing,
      ...input,
      recipe_name: input.recipe_name || input.recipeName || existing.recipe_name,
      dish_name: input.dish_name || input.dishName || existing.dish_name,
    },
    {
      slug: existing.slug,
      owner_user_id: existing.owner_user_id,
      visibility: existing.visibility,
      source: existing.source,
      is_published: existing.is_published,
      data_status: existing.data_status,
      moderation_status: existing.moderation_status,
    }
  );

  delete payload.owner_user_id;
  delete payload.source;

  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .update(payload)
    .eq('id', Number(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function deleteRecipe(id, user) {
  const hasTrashColumns = await supportsRecipeTrashColumns();

  const existing = await getRecipeById(id);
  assertOwnerOrAdmin(existing, user);
  if (hasTrashColumns) {
    assertRecipeNotTrashed(existing);
  } else if (isLegacyRecipeTrashed(existing)) {
    const error = new Error('Recipe is already in Trash');
    error.statusCode = 409;
    throw error;
  }

  const payload = hasTrashColumns
    ? {
      visibility: 'private',
      is_published: false,
      trashed_at: new Date().toISOString(),
      trashed_by: Number(user?.userId) || null,
      trash_reason: TRASH_REASON_DEFAULT,
      trash_snapshot: buildTrashSnapshot(existing),
    }
    : {
      visibility: 'private',
      is_published: false,
      data_status: 'rejected',
      moderation_reason: encodeLegacyTrashMarker(buildTrashSnapshot(existing)),
    };

  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .update(payload)
    .eq('id', Number(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function recoverRecipe(id, user) {
  const hasTrashColumns = await supportsRecipeTrashColumns();

  const existing = await getRecipeById(id);
  assertOwnerOrAdmin(existing, user);
  assertRecipeTrashed(existing);

  const snapshot = hasTrashColumns
    ? normalizeObject(existing.trash_snapshot)
    : decodeLegacyTrashMarker(existing.moderation_reason);

  if (!snapshot && hasTrashColumns) {
    const error = new Error('Trash snapshot is missing for this recipe');
    error.statusCode = 409;
    throw error;
  }

  const fallbackSnapshot = snapshot || {
    visibility: 'private',
    is_published: false,
    data_status: 'draft',
    moderation_status: 'not_required',
    moderation_reason: null,
  };

  const payload = hasTrashColumns
    ? {
      visibility: fallbackSnapshot.visibility ?? existing.visibility,
      is_published:
          typeof fallbackSnapshot.is_published === 'boolean'
            ? fallbackSnapshot.is_published
            : existing.is_published,
      data_status: fallbackSnapshot.data_status ?? existing.data_status,
      moderation_status: fallbackSnapshot.moderation_status ?? existing.moderation_status,
      moderation_reason: fallbackSnapshot.moderation_reason ?? existing.moderation_reason,
      submitted_at: fallbackSnapshot.submitted_at ?? existing.submitted_at,
      reviewed_at: fallbackSnapshot.reviewed_at ?? existing.reviewed_at,
      reviewed_by: fallbackSnapshot.reviewed_by ?? existing.reviewed_by,
      published_at: fallbackSnapshot.published_at ?? existing.published_at,
      trashed_at: null,
      trashed_by: null,
      trash_reason: null,
      trash_snapshot: null,
    }
    : {
      visibility: fallbackSnapshot.visibility ?? existing.visibility,
      is_published:
          typeof fallbackSnapshot.is_published === 'boolean'
            ? fallbackSnapshot.is_published
            : existing.is_published,
      data_status: fallbackSnapshot.data_status ?? existing.data_status,
      moderation_status: fallbackSnapshot.moderation_status ?? existing.moderation_status,
      moderation_reason: fallbackSnapshot.moderation_reason ?? null,
      submitted_at: fallbackSnapshot.submitted_at ?? existing.submitted_at,
      reviewed_at: fallbackSnapshot.reviewed_at ?? existing.reviewed_at,
      reviewed_by: fallbackSnapshot.reviewed_by ?? existing.reviewed_by,
      published_at: fallbackSnapshot.published_at ?? existing.published_at,
    };

  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .update(payload)
    .eq('id', Number(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function permanentlyDeleteRecipe(id, user) {
  const hasTrashColumns = await supportsRecipeTrashColumns();

  const existing = await getRecipeById(id);
  assertOwnerOrAdmin(existing, user);
  if (hasTrashColumns) {
    assertRecipeTrashed(existing);
  } else if (!isLegacyRecipeTrashed(existing)) {
    const error = new Error('Only trashed recipes can be permanently deleted');
    error.statusCode = 409;
    throw error;
  }

  const { error } = await supabaseService
    .from(RECIPE_TABLE)
    .delete()
    .eq('id', Number(id));

  if (error) throw error;
  return { id: Number(id), deleted: true };
}

async function submitRecipeToCommunity(id, user) {
  const recipe = await getRecipeById(id);
  assertOwnerOrAdmin(recipe, user);
  assertRecipeNotTrashed(recipe);

  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .update({
      visibility: 'community_pending',
      is_published: false,
      moderation_status: 'pending',
      data_status: 'needs_review',
      submitted_at: new Date().toISOString(),
      moderation_reason: null,
    })
    .eq('id', Number(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function listPendingCommunityRecipes(filters = {}) {
  const query = supabaseService
    .from(RECIPE_TABLE)
    .select('*', { count: 'exact' })
    .eq('visibility', 'community_pending')
    .eq('moderation_status', 'pending');

  return runListQuery(query, filters);
}

async function approveCommunityRecipe(id, adminUserId) {
  const existing = await getRecipeById(id);
  assertRecipeNotTrashed(existing);
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .update({
      visibility: 'community',
      is_published: true,
      data_status: 'published',
      moderation_status: 'approved',
      reviewed_by: Number(adminUserId),
      reviewed_at: now,
      published_at: now,
      moderation_reason: null,
    })
    .eq('id', Number(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function rejectCommunityRecipe(id, adminUserId, reason) {
  const existing = await getRecipeById(id);
  assertRecipeNotTrashed(existing);
  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .update({
      visibility: 'private',
      is_published: false,
      data_status: 'rejected',
      moderation_status: 'rejected',
      reviewed_by: Number(adminUserId),
      reviewed_at: new Date().toISOString(),
      moderation_reason: cleanText(reason) || 'Rejected by admin',
    })
    .eq('id', Number(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function publishCatalogRecipe(id, adminUserId) {
  const existing = await getRecipeById(id);
  assertRecipeNotTrashed(existing);
  if (!cleanText(existing?.image_url)) {
    const error = new Error('Recipe must have an image_url before publishing');
    error.statusCode = 400;
    error.code = 'RECIPE_IMAGE_REQUIRED';
    throw error;
  }
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .update({
      owner_user_id: null,
      visibility: 'public',
      is_published: true,
      data_status: 'published',
      moderation_status: 'not_required',
      reviewed_by: Number(adminUserId),
      reviewed_at: now,
      published_at: now,
    })
    .eq('id', Number(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function unpublishCatalogRecipe(id, adminUserId) {
  const existing = await getRecipeById(id);
  assertRecipeNotTrashed(existing);

  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .update({
      visibility: 'private',
      is_published: false,
      data_status: 'needs_review',
      moderation_status: 'not_required',
      reviewed_by: Number(adminUserId),
      reviewed_at: new Date().toISOString(),
      published_at: null,
    })
    .eq('id', Number(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function fetchMissingRecipeImages(input = {}, adminUserId) {
  if (!getUnsplashAccessKey()) {
    const error = new Error('Unsplash image fetching is not configured. Set UNSPLASH_ACCESS_KEY in the backend .env and restart the API.');
    error.statusCode = 503;
    throw error;
  }

  const rawIds = Array.isArray(input.recipe_ids || input.recipeIds) ? input.recipe_ids || input.recipeIds : [];
  const ids = rawIds
    .map((id) => Number(id))
    .filter((id, index, list) => Number.isInteger(id) && id > 0 && list.indexOf(id) === index);
  const limit = Math.min(Math.max(Number(input.limit) || 50, 1), 100);

  let query = supabaseService
    .from(RECIPE_TABLE)
    .select('*')
    .or('image_url.is.null,image_url.eq.')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (ids.length) query = query.in('id', ids);

  const { data: recipes, error } = await query;
  if (error) throw error;

  const results = [];
  for (const recipe of recipes || []) {
    try {
      const image = await fetchDishImageMetadata(
        recipe.recipe_name || recipe.dish_name,
        recipe.cuisine_name_snapshot
      );

      if (!image?.image_url) {
        results.push({ id: recipe.id, status: 'no_image', recipe_name: recipe.recipe_name });
        continue;
      }

      const { data: updated, error: updateError } = await supabaseService
        .from(RECIPE_TABLE)
        .update({
          ...image,
          reviewed_by: Number(adminUserId) || recipe.reviewed_by || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', Number(recipe.id))
        .select('id,recipe_name,image_url,image_source')
        .single();

      if (updateError) throw updateError;
      results.push({ id: recipe.id, status: 'image_added', recipe_name: updated.recipe_name, image_url: updated.image_url });
    } catch (error) {
      results.push({
        id: recipe.id,
        status: 'failed',
        recipe_name: recipe.recipe_name,
        error: error?.message || 'Image fetch failed',
      });
    }
  }

  return results;
}

async function importDishNames(input = {}, adminUserId) {
  const names = Array.isArray(input.names) ? input.names : [];
  return importDishRows(
    names.map((name) => ({
      dish_name: name,
      meal_type: input.meal_type,
      cuisine_hint: input.cuisine_hint || input.cuisineHint,
      cooking_method_hint: input.cooking_method_hint || input.cookingMethodHint,
      admin_notes: input.admin_notes || input.adminNotes,
      recipe_name: input.recipe_name,
      description: input.description,
      servings: input.servings,
      calories: input.calories,
      ingredients: input.ingredients,
      instructions: input.instructions,
    })),
    adminUserId
  );
}

async function importDishRows(rowsInput = [], adminUserId) {
  const baseRows = (Array.isArray(rowsInput) ? rowsInput : [])
    .map((row) => {
      const manualDraft = normalizeManualImportDraft(row || {});
      const rawMealType = row?.meal_type || row?.mealType || manualDraft.meal_type;
      return {
        dish_name: cleanText(row?.dish_name || row?.dishName || row?.name || manualDraft.recipe_name),
        meal_type_raw: cleanText(rawMealType) || null,
        cuisine_hint: row?.cuisine_hint || row?.cuisineHint || manualDraft.cuisine_name,
        cooking_method_hint: row?.cooking_method_hint || row?.cookingMethodHint || manualDraft.cooking_method_name,
        admin_notes: row?.admin_notes || row?.adminNotes || row?.notes || manualDraft.notes,
        manual_draft: manualDraft,
      };
    })
    .filter((row) => row.dish_name)
    .map((row) => ({
      dish_name: row.dish_name,
      cuisine_hint: cleanText(row.cuisine_hint) || null,
      cooking_method_hint: cleanText(row.cooking_method_hint) || null,
      admin_notes: cleanText(row.admin_notes) || null,
      ai_raw_response:
        row.manual_draft && Object.keys(row.manual_draft).length
          ? { manual_input: row.manual_draft, source_kind: 'manual_import' }
          : null,
      created_by: Number(adminUserId),
      status: 'pending',
    }));

  if (!baseRows.length) {
    const error = new Error('Import file must contain at least one valid dish_name');
    error.statusCode = 400;
    throw error;
  }

  const buildInsertRows = (mode = 'canonical') =>
    baseRows.map((row) => {
      let mealType = null;
      if (mode === 'legacy') {
        mealType = row.meal_type_raw ? normalizeLegacyQueueMealType(row.meal_type_raw, null) : null;
      } else if (mode === 'null_other') {
        const canonical = row.meal_type_raw ? normalizeMealType(row.meal_type_raw, null) : null;
        mealType = canonical === 'other' ? null : canonical;
      } else {
        mealType = row.meal_type_raw ? normalizeMealType(row.meal_type_raw, null) : null;
      }

      return {
        dish_name: row.dish_name,
        meal_type: mealType,
        cuisine_hint: row.cuisine_hint,
        cooking_method_hint: row.cooking_method_hint,
        admin_notes: row.admin_notes,
        ai_raw_response: row.ai_raw_response,
        created_by: row.created_by,
        status: row.status,
      };
    });

  const insertRows = async (rows) => {
    const { data, error } = await supabaseService
      .from(IMPORT_QUEUE_TABLE)
      .insert(rows)
      .select('*');
    if (error) throw error;
    return data || [];
  };

  try {
    return await insertRows(buildInsertRows('canonical'));
  } catch (error) {
    if (!isMealTypeConstraintViolation(error)) throw error;
  }

  try {
    return await insertRows(buildInsertRows('legacy'));
  } catch (error) {
    if (!isMealTypeConstraintViolation(error)) throw error;
  }

  try {
    return await insertRows(buildInsertRows('null_other'));
  } catch (error) {
    if (!isMealTypeConstraintViolation(error)) throw error;
  }

  const compatibilityError = new Error(
    'Import meal_type constraint mismatch. Please update DB constraint to allow breakfast/lunch/dinner/other.'
  );
  compatibilityError.statusCode = 409;
  throw compatibilityError;
}

async function listImportQueue(filters = {}) {
  const status = cleanText(filters.status);
  let query = supabaseService.from(IMPORT_QUEUE_TABLE).select('*', { count: 'exact' });
  if (status) query = query.eq('status', status);
  const result = await runListQuery(query, filters);
  return {
    ...result,
    items: (result.items || []).map((row) => decorateQueueRowForReview(row)),
  };
}

async function getImportQueueRowById(id) {
  const { data, error } = await supabaseService
    .from(IMPORT_QUEUE_TABLE)
    .select('*')
    .eq('id', normalizeImportQueueId(id))
    .single();

  if (error) throw error;
  return data;
}

function assertImportQueueRowEditable(row) {
  const status = normalizeQueueStatus(row?.status);
  if (!EDITABLE_IMPORT_QUEUE_STATUSES.has(status)) {
    const error = new Error(`Queue item with status "${status || 'unknown'}" cannot be edited`);
    error.statusCode = 409;
    throw error;
  }
}

function normalizeQueueStatus(value) {
  return cleanText(value).toLowerCase();
}

function normalizeImportQueueId(id) {
  const value = cleanText(id);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(value)) return value;

  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;

  const error = new Error('Invalid queue row id');
  error.statusCode = 400;
  throw error;
}

function normalizeImportQueueIds(inputIds = []) {
  const seen = new Set();
  const output = [];
  (Array.isArray(inputIds) ? inputIds : []).forEach((rawId) => {
    try {
      const id = normalizeImportQueueId(rawId);
      const dedupeKey = String(id);
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        output.push(id);
      }
    } catch (_error) {
      // Ignore invalid ids in bulk input.
    }
  });
  return output;
}

function normalizeQueueRawObject(value) {
  return normalizeObject(value) || {};
}

function extractAiPayloadFromRaw(raw = {}) {
  const nested = normalizeObject(raw.enriched_payload);
  if (nested && Object.keys(nested).length) return nested;
  if (cleanText(raw.recipe_name) || Array.isArray(raw.ingredients) || Array.isArray(raw.instructions)) return raw;
  return {};
}

function readDraftField(input = {}, keys = []) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
      return input[key];
    }
  }
  return undefined;
}

function normalizeManualImportDraft(input = {}) {
  const draft = {};
  const assignText = (key, keys = [key]) => {
    const value = readDraftField(input, keys);
    if (value === undefined) return;
    draft[key] = cleanText(value) || null;
  };
  const assignNumber = (key, keys = [key]) => {
    const value = readDraftField(input, keys);
    if (value === undefined) return;
    draft[key] = numberOrNull(value);
  };
  const assignList = (key, keys = [key]) => {
    const value = readDraftField(input, keys);
    if (value === undefined) return;
    draft[key] = normalizeArray(value);
  };
  const assignIngredients = (keys = ['ingredients', 'ingredients_json']) => {
    const value = readDraftField(input, keys);
    if (value === undefined) return;
    const parsed = normalizeJsonArray(value);
    draft.ingredients = Array.isArray(parsed)
      ? parsed
          .map((entry) => {
            if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
              const name = cleanText(entry.name || entry.ingredient_name || entry.ingredient);
              if (!name) return null;
              return {
                name,
                quantity: numberOrNull(entry.quantity ?? entry.qty),
                unit: cleanText(entry.unit) || null,
                notes: cleanText(entry.notes) || null,
              };
            }
            const name = cleanText(entry);
            return name ? { name } : null;
          })
          .filter(Boolean)
      : [];
  };
  const assignInstructions = (keys = ['instructions', 'instructions_json']) => {
    const value = readDraftField(input, keys);
    if (value === undefined) return;
    draft.instructions = normalizeJsonArray(value, { asInstruction: true }).map((line) => cleanText(line)).filter(Boolean);
  };

  assignText('recipe_name', ['recipe_name', 'name']);
  assignText('display_name');
  assignText('description');
  assignText('meal_type', ['meal_type', 'mealtype']);
  assignText('cuisine_name', ['cuisine_name', 'cuisine']);
  assignText('cooking_method_name', ['cooking_method_name', 'method_name', 'cooking_method']);
  assignText('difficulty');
  assignText('spice_level');
  assignNumber('prep_time_minutes');
  assignNumber('cook_time_minutes');
  assignNumber('servings');
  assignText('serving_size');
  assignIngredients();
  assignInstructions();
  assignList('equipment', ['equipment', 'equipment_csv']);
  assignList('tips', ['tips', 'tips_csv']);
  assignText('storage_instructions');
  assignText('reheating_instructions');
  assignList('dietary_tags', ['dietary_tags', 'dietary_tags_csv']);
  assignList('health_tags', ['health_tags', 'health_tags_csv']);
  assignList('allergens', ['allergens', 'allergens_csv']);
  assignList('avoid_for_conditions', ['avoid_for_conditions', 'avoid_for_conditions_csv']);
  assignList('suitable_goals', ['suitable_goals', 'suitable_goals_csv']);
  assignNumber('calories');
  assignNumber('protein');
  assignNumber('fat');
  assignNumber('saturated_fat');
  assignNumber('carbohydrates');
  assignNumber('fiber');
  assignNumber('sugar');
  assignNumber('sodium');
  assignNumber('potassium');
  assignNumber('calcium');
  assignNumber('iron');
  assignNumber('vitamin_a');
  assignNumber('vitamin_c');
  assignText('image_url');
  assignText('notes');

  return draft;
}

function mergeQueueDraft(row) {
  const raw = normalizeQueueRawObject(row?.ai_raw_response);
  const manual = normalizeObject(raw.manual_input) || {};
  const aiPayload = extractAiPayloadFromRaw(raw);
  const hasManualValue = (value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return Boolean(cleanText(value));
    return true;
  };
  const pick = (key, fallback = null) => {
    if (Object.prototype.hasOwnProperty.call(manual, key) && hasManualValue(manual[key])) return manual[key];
    if (Object.prototype.hasOwnProperty.call(aiPayload, key)) return aiPayload[key];
    return fallback;
  };

  return {
    recipe_name: cleanText(pick('recipe_name')) || null,
    display_name: cleanText(pick('display_name')) || null,
    description: cleanText(pick('description')) || null,
    meal_type: normalizeMealType(pick('meal_type', row?.meal_type), null),
    cuisine_name: cleanText(pick('cuisine_name', row?.cuisine_hint)) || null,
    cooking_method_name: cleanText(pick('cooking_method_name', row?.cooking_method_hint)) || null,
    difficulty: cleanText(pick('difficulty')) || null,
    spice_level: cleanText(pick('spice_level')) || null,
    prep_time_minutes: numberOrNull(pick('prep_time_minutes')),
    cook_time_minutes: numberOrNull(pick('cook_time_minutes')),
    servings: numberOrNull(pick('servings')),
    serving_size: cleanText(pick('serving_size')) || null,
    ingredients: normalizeJsonArray(pick('ingredients')),
    instructions: normalizeJsonArray(pick('instructions'), { asInstruction: true }),
    equipment: normalizeArray(pick('equipment')),
    tips: normalizeArray(pick('tips')),
    storage_instructions: cleanText(pick('storage_instructions')) || null,
    reheating_instructions: cleanText(pick('reheating_instructions')) || null,
    dietary_tags: normalizeArray(pick('dietary_tags')),
    health_tags: normalizeArray(pick('health_tags')),
    allergens: normalizeArray(pick('allergens')),
    avoid_for_conditions: normalizeArray(pick('avoid_for_conditions')),
    suitable_goals: normalizeArray(pick('suitable_goals')),
    calories: numberOrNull(pick('calories')),
    protein: numberOrNull(pick('protein')),
    fat: numberOrNull(pick('fat')),
    saturated_fat: numberOrNull(pick('saturated_fat')),
    carbohydrates: numberOrNull(pick('carbohydrates')),
    fiber: numberOrNull(pick('fiber')),
    sugar: numberOrNull(pick('sugar')),
    sodium: numberOrNull(pick('sodium')),
    potassium: numberOrNull(pick('potassium')),
    calcium: numberOrNull(pick('calcium')),
    iron: numberOrNull(pick('iron')),
    vitamin_a: numberOrNull(pick('vitamin_a')),
    vitamin_c: numberOrNull(pick('vitamin_c')),
    image_url: cleanText(pick('image_url')) || null,
    notes: cleanText(pick('notes', row?.admin_notes)) || null,
    source_kind: Object.keys(manual).length
      ? Object.keys(aiPayload).length
        ? 'hybrid'
        : 'manual'
      : Object.keys(aiPayload).length
        ? 'ai'
        : 'none',
  };
}

function getQueueMissingDataFields(row, draft = mergeQueueDraft(row)) {
  const missing = [];
  if (!normalizeMealType(draft.meal_type, null)) missing.push('meal_type');
  if (!cleanText(draft.recipe_name) && !cleanText(row?.dish_name)) missing.push('recipe_name');
  if (!Array.isArray(draft.ingredients) || draft.ingredients.length < 3) missing.push('ingredients');
  if (!Array.isArray(draft.instructions) || draft.instructions.length < 3) missing.push('instructions');
  if (numberOrNull(draft.servings) === null) missing.push('servings');
  if (numberOrNull(draft.calories) === null) missing.push('calories');
  return missing;
}

function decorateQueueRowForReview(row) {
  const draft = mergeQueueDraft(row);
  const missingFields = getQueueMissingDataFields(row, draft);
  return {
    ...row,
    draft,
    completeness_status: missingFields.length ? 'missing_data' : 'ready',
    missing_fields: missingFields,
    missing_fields_count: missingFields.length,
  };
}

async function updateImportQueueRow(id, input = {}) {
  const row = await getImportQueueRowById(id);
  assertImportQueueRowEditable(row);

  const nextDishName = cleanText(input.dish_name ?? row.dish_name);
  if (!nextDishName) {
    const error = new Error('dish_name is required');
    error.statusCode = 400;
    throw error;
  }

  const raw = normalizeQueueRawObject(row?.ai_raw_response);
  const existingManual = normalizeObject(raw.manual_input) || {};
  const nextManual = {
    ...existingManual,
    ...normalizeManualImportDraft(input),
  };

  const payload = {
    dish_name: nextDishName,
    meal_type: cleanText(input.meal_type) ? normalizeMealType(input.meal_type, null) : null,
    cuisine_hint: cleanText(input.cuisine_hint) || null,
    cooking_method_hint: cleanText(input.cooking_method_hint) || null,
    admin_notes: cleanText(input.admin_notes) || null,
    ai_raw_response: {
      ...raw,
      manual_input: nextManual,
    },
  };

  const { data, error } = await supabaseService
    .from(IMPORT_QUEUE_TABLE)
    .update(payload)
    .eq('id', normalizeImportQueueId(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function moveImportQueueRowToTrash(id, reason = '') {
  const row = await getImportQueueRowById(id);
  const status = normalizeQueueStatus(row?.status);
  if (!CANCELABLE_IMPORT_QUEUE_STATUSES.has(status)) {
    const error = new Error(`Queue item with status "${status || 'unknown'}" cannot be canceled`);
    error.statusCode = 409;
    throw error;
  }

  const note = cleanText(reason);
  const payload = {
    status: 'rejected',
    error_message: note || row.error_message || 'Moved to trash by admin',
  };

  const { data, error } = await supabaseService
    .from(IMPORT_QUEUE_TABLE)
    .update(payload)
    .eq('id', normalizeImportQueueId(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function recoverImportQueueRow(id) {
  const row = await getImportQueueRowById(id);
  const status = normalizeQueueStatus(row?.status);
  if (status !== 'rejected' && status !== 'failed') {
    const error = new Error('Only canceled or failed items can be retried');
    error.statusCode = 409;
    throw error;
  }

  const { data, error } = await supabaseService
    .from(IMPORT_QUEUE_TABLE)
    .update({
      status: 'pending',
      error_message: null,
    })
    .eq('id', normalizeImportQueueId(id))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function hardDeleteImportQueueRow(id) {
  const row = await getImportQueueRowById(id);
  const status = normalizeQueueStatus(row?.status);
  if (status !== 'rejected') {
    const error = new Error('Only trashed items can be permanently deleted');
    error.statusCode = 409;
    throw error;
  }

  const { error } = await supabaseService
    .from(IMPORT_QUEUE_TABLE)
    .delete()
    .eq('id', normalizeImportQueueId(id));

  if (error) throw error;
  return { id: normalizeImportQueueId(id), deleted: true };
}

async function approveImportQueueRows(input = {}, adminUserId) {
  const queueIds = normalizeImportQueueIds(input.queue_ids || input.queueIds || []);
  if (!queueIds.length) {
    const error = new Error('queue_ids is required');
    error.statusCode = 400;
    throw error;
  }

  const { data: queueRows, error: queueError } = await supabaseService
    .from(IMPORT_QUEUE_TABLE)
    .select('*')
    .in('id', queueIds);
  if (queueError) throw queueError;

  const queueById = new Map((queueRows || []).map((row) => [String(row.id), row]));
  const refs = await getReferenceLookups();
  const results = [];

  for (const queueId of queueIds) {
    const row = queueById.get(String(queueId));
    if (!row) {
      results.push({ queueId, status: 'skipped', reason: 'Queue item not found' });
      continue;
    }

    const status = normalizeQueueStatus(row.status);
    if (status === 'imported') {
      results.push({ queueId: row.id, status: 'skipped', reason: 'Already imported', target_recipe_id: row.target_recipe_id });
      continue;
    }
    if (status === 'rejected' || status === 'enriching') {
      results.push({ queueId: row.id, status: 'skipped', reason: `Status ${status} cannot be approved` });
      continue;
    }

    const draft = mergeQueueDraft(row);
    const missingFields = getQueueMissingDataFields(row, draft);

    try {
      let image = null;
      if (!cleanText(draft.image_url)) {
        image = await fetchDishImageMetadata(row.dish_name, draft.cuisine_name || row.cuisine_hint);
      }

      const raw = normalizeQueueRawObject(row.ai_raw_response);
      const aiPayload = extractAiPayloadFromRaw(raw);
      const recipePayload = buildRecipePayload(
        {
          ...draft,
          dish_name: row.dish_name,
          recipe_name: draft.recipe_name || row.dish_name,
          meal_type: draft.meal_type || row.meal_type || 'breakfast',
          cuisine_name: draft.cuisine_name || row.cuisine_hint,
          cooking_method_name: draft.cooking_method_name || row.cooking_method_hint,
          cuisine_id: findLookupId(refs.cuisines, draft.cuisine_name || row.cuisine_hint),
          cooking_method_id: findLookupId(
            refs.cookingMethods,
            draft.cooking_method_name || row.cooking_method_hint
          ),
          ...(image || {}),
        },
        {
          owner_user_id: null,
          visibility: 'private',
          source: draft.source_kind === 'manual' ? 'admin_created' : 'admin_ai',
          is_published: false,
          data_status: 'needs_review',
          moderation_status: 'not_required',
          ai_generated: Boolean(cleanText(aiPayload.recipe_name)),
          ai_provider: cleanText(raw.ai_provider) || null,
          ai_model: cleanText(raw.ai_model) || null,
          ai_prompt_version: cleanText(raw.ai_prompt_version) || null,
          ai_confidence: numberOrNull(aiPayload.ai_confidence),
          ai_raw_response: aiPayload && Object.keys(aiPayload).length ? aiPayload : null,
          quality_notes: cleanText(aiPayload.quality_notes) || null,
          reviewed_by: Number(adminUserId),
          reviewed_at: new Date().toISOString(),
        }
      );

      const { data: recipe, error: insertError } = await supabaseService
        .from(RECIPE_TABLE)
        .insert(recipePayload)
        .select('*')
        .single();
      if (insertError) throw insertError;

      const { error: updateQueueError } = await supabaseService
        .from(IMPORT_QUEUE_TABLE)
        .update({
          status: 'imported',
          target_recipe_id: recipe.id,
          error_message: null,
        })
        .eq('id', row.id);
      if (updateQueueError) throw updateQueueError;

      results.push({
        queueId: row.id,
        status: 'imported',
        target_recipe_id: recipe.id,
        approved_with_missing_data: missingFields.length > 0,
        missing_fields: missingFields,
      });
    } catch (error) {
      await supabaseService
        .from(IMPORT_QUEUE_TABLE)
        .update({
          status: 'failed',
          error_message: error?.message || 'Approve/import failed',
        })
        .eq('id', row.id);
      results.push({
        queueId: row.id,
        status: 'failed',
        error: error?.message || 'Approve/import failed',
      });
    }
  }

  return results;
}

async function enrichImportQueueBatch(input = {}, adminUserId) {
  const limit = Math.min(Math.max(Number(input.limit) || 3, 1), 10);
  const queueIds = normalizeImportQueueIds(input.queue_ids || input.queueIds || []);

  let queueQuery = supabaseService.from(IMPORT_QUEUE_TABLE).select('*').order('created_at', { ascending: true });
  if (queueIds.length) {
    queueQuery = queueQuery.in('id', queueIds);
  } else {
    queueQuery = queueQuery.eq('status', 'pending').limit(limit);
  }

  const { data: queueRows, error: queueError } = await queueQuery;

  if (queueError) throw queueError;

  const results = [];
  let pausedByQuota = false;
  let pauseReason = null;
  const enrichableStatuses = new Set(['pending', 'queued', 'failed', 'enriched']);

  for (const row of queueRows || []) {
    const currentStatus = normalizeQueueStatus(row.status);
    if (!enrichableStatuses.has(currentStatus)) {
      results.push({ queueId: row.id, dishName: row.dish_name, status: 'skipped', reason: `Status ${currentStatus} not enrichable` });
      continue;
    }

    try {
      await supabaseService
        .from(IMPORT_QUEUE_TABLE)
        .update({ status: 'enriching', error_message: null })
        .eq('id', row.id);

      const ai = await generateRecipeEnrichment(row);
      const aiPayload = normalizeEnrichmentPayload(ai.parsed, row);

      const latestQueueRow = await getImportQueueRowById(row.id);
      if (normalizeQueueStatus(latestQueueRow?.status) === 'rejected') {
        results.push({ queueId: row.id, dishName: row.dish_name, status: 'canceled' });
        continue;
      }

      const image = await fetchDishImageMetadata(
        aiPayload.dish_name || aiPayload.recipe_name || row.dish_name,
        aiPayload.cuisine_name || row.cuisine_hint
      );

      const beforeInsertQueueRow = await getImportQueueRowById(row.id);
      if (normalizeQueueStatus(beforeInsertQueueRow?.status) === 'rejected') {
        results.push({ queueId: row.id, dishName: row.dish_name, status: 'canceled' });
        continue;
      }

      const raw = normalizeQueueRawObject(row.ai_raw_response);
      const manual = normalizeObject(raw.manual_input) || {};
      const enrichedPayload = {
        ...aiPayload,
        ...(image || {}),
      };
      const nextRawResponse = {
        ...enrichedPayload,
        manual_input: manual,
        enriched_payload: enrichedPayload,
        ai_provider: ai.provider,
        ai_model: ai.model,
        ai_prompt_version: ENRICHMENT_PROMPT_VERSION,
        ai_confidence: numberOrNull(aiPayload.ai_confidence),
        quality_notes: cleanText(aiPayload.quality_notes) || null,
      };
      const decoratedNextRow = decorateQueueRowForReview({
        ...row,
        ai_raw_response: nextRawResponse,
      });
      const missingFields = Array.isArray(decoratedNextRow.missing_fields) ? decoratedNextRow.missing_fields : [];
      const nextStatus = missingFields.length ? 'failed' : 'enriched';
      const nextErrorMessage = missingFields.length
        ? `AI enrichment incomplete. Missing: ${missingFields.join(', ')}`
        : null;

      const { error: updateQueueError } = await supabaseService
        .from(IMPORT_QUEUE_TABLE)
        .update({
          status: nextStatus,
          ai_raw_response: nextRawResponse,
          error_message: nextErrorMessage,
        })
        .eq('id', row.id);

      if (updateQueueError) throw updateQueueError;

      results.push({
        queueId: row.id,
        status: nextStatus,
        missing_fields: missingFields,
        error: nextErrorMessage,
      });
    } catch (error) {
      const quotaReason = detectQuotaPauseReason(error);
      if (quotaReason) {
        await supabaseService
          .from(IMPORT_QUEUE_TABLE)
          .update({
            status: 'pending',
            error_message: `AI quota exceeded. Enrichment paused. ${quotaReason}`,
          })
          .eq('id', row.id);

        results.push({
          queueId: row.id,
          dishName: row.dish_name,
          status: 'quota_paused',
          error: quotaReason,
        });

        pausedByQuota = true;
        pauseReason = quotaReason;
        break;
      }

      await supabaseService
        .from(IMPORT_QUEUE_TABLE)
        .update({
          status: 'failed',
          error_message: error?.message || 'Enrichment failed',
        })
        .eq('id', row.id);

      results.push({
        queueId: row.id,
        dishName: row.dish_name,
        status: 'failed',
        error: error?.message || 'Enrichment failed',
      });
    }
  }

  return {
    rows: results,
    pausedByQuota,
    pauseReason,
  };
}

async function ensureInteractableRecipe(recipeId, user) {
  const recipe = await getRecipeById(recipeId);
  if (!canUserReadRecipe(recipe, user)) {
    const error = new Error('Recipe not found or not accessible');
    error.statusCode = 404;
    throw error;
  }
  return recipe;
}

async function syncCounter(recipeId, relationTable, column) {
  const { count, error: countError } = await supabaseService
    .from(relationTable)
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', Number(recipeId));

  if (countError) throw countError;

  const { data, error } = await supabaseService
    .from(RECIPE_TABLE)
    .update({ [column]: count || 0 })
    .eq('id', Number(recipeId))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function likeRecipe(recipeId, user) {
  await ensureInteractableRecipe(recipeId, user);
  const { error } = await supabaseService
    .from('recipe_library_likes')
    .upsert({ recipe_id: Number(recipeId), user_id: Number(user.userId) }, { onConflict: 'recipe_id,user_id' });

  if (error) throw error;
  return syncCounter(recipeId, 'recipe_library_likes', 'like_count');
}

async function saveRecipe(recipeId, user) {
  await ensureInteractableRecipe(recipeId, user);
  const { error } = await supabaseService
    .from('recipe_library_saves')
    .upsert({ recipe_id: Number(recipeId), user_id: Number(user.userId) }, { onConflict: 'recipe_id,user_id' });

  if (error) throw error;
  return syncCounter(recipeId, 'recipe_library_saves', 'save_count');
}

async function addComment(recipeId, body, user) {
  await ensureInteractableRecipe(recipeId, user);
  const text = cleanText(body);
  if (!text) {
    const error = new Error('Comment body is required');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabaseService
    .from('recipe_library_comments')
    .insert({ recipe_id: Number(recipeId), user_id: Number(user.userId), body: text })
    .select('*')
    .single();

  if (error) throw error;
  await syncCounter(recipeId, 'recipe_library_comments', 'comment_count');
  return data;
}

async function reportRecipe(recipeId, input, user) {
  await ensureInteractableRecipe(recipeId, user);
  const reason = cleanText(input.reason);
  if (!reason) {
    const error = new Error('Report reason is required');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabaseService
    .from('recipe_library_reports')
    .insert({
      recipe_id: Number(recipeId),
      user_id: Number(user.userId),
      reason,
      details: cleanText(input.details) || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  await syncCounter(recipeId, 'recipe_library_reports', 'report_count');
  return data;
}

module.exports = {
  approveCommunityRecipe,
  createPrivateRecipe,
  getRecipeById,
  enrichImportQueueBatch,
  approveImportQueueRows,
  importDishNames,
  importDishRows,
  likeRecipe,
  listAddMealRecipes,
  listAdminRecipes,
  listImportQueue,
  updateImportQueueRow,
  moveImportQueueRowToTrash,
  recoverImportQueueRow,
  hardDeleteImportQueueRow,
  recoverRecipe,
  permanentlyDeleteRecipe,
  listMyRecipes,
  listPendingCommunityRecipes,
  listPublishedRecipes,
  fetchMissingRecipeImages,
  publishCatalogRecipe,
  unpublishCatalogRecipe,
  deleteRecipe,
  rejectCommunityRecipe,
  reportRecipe,
  saveLegacyUserRecipeToLibrary,
  saveRecipe,
  submitRecipeToCommunity,
  updateRecipe,
  addComment,
  canUserReadRecipe,
};
