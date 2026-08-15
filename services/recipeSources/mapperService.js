/**
 * LLM mapper: turns a source recipe into a NutriHelp draft.
 *
 * The model MAPS ONLY. It may restructure and reformat source content; it may
 * not add facts. Two gates enforce that — Joi schema validation and the
 * fidelity check — and if either fails we discard the model output and use a
 * deterministic mapping instead. The endpoint therefore always returns a
 * usable draft and never returns invented content.
 */
const Joi = require('joi');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { checkFidelity } = require('./fidelity');
const logger = require('../../utils/logger');

const DEFAULT_MODEL = 'gemini-flash-latest';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash';
const MAX_ATTEMPTS = 2;
// The mapping call is otherwise unbounded: one request was observed hanging for
// 242s before completing. Past this, the deterministic fallback produces a full
// draft in about a second, so waiting longer serves nobody.
const LLM_TIMEOUT_MS = 45000;

const TARGET_FIELDS = [
  'recipe_name',
  'description',
  'cuisine_name',
  'cooking_method_name',
  'meal_type',
  'servings',
  'prep_time_minutes',
  'cook_time_minutes',
  'difficulty',
  'image_url',
  'ingredients',
  'instructions',
  'calories',
  'protein',
  'fat',
  'carbohydrates',
];

// Nutrition is never available from TheMealDB; it is listed as a target field
// so the UI can flag it, but the mapper must never populate it.
const NUTRITION_FIELDS = ['calories', 'protein', 'fat', 'carbohydrates'];

// NutriHelp's controlled cooking_methods vocabulary (cooking_methods table).
// The mapper picks from this list rather than inventing free text, so the value
// lines up with the form's dropdown.
//
// NOTE: cooking_method_name is DERIVED from the instruction prose, not copied
// from a source field — TheMealDB has no cooking-method column. It is therefore
// the one drafted field the fidelity check cannot prove against source text.
// Decision taken deliberately (2026-08-16): LLM judgement, no code-level
// verification. If derived methods prove unreliable, the cheap hardening is to
// require the chosen method's stem to appear in the source instructions.
// NutriHelp's ingredient-category vocabulary. The stored data is inconsistent
// ("Meat & Seafood" / "Meat & Sea Food" / "Meat and Sea Food" all appear), so
// this is a cleaned canonical set rather than a raw dump of the column.
//
// Categorising an ingredient is classification, not invention: "penne rigate"
// is Pantry whatever the source says. recipe_ingredient.cuisine_id is NOT NULL,
// so a blank category makes a prefilled recipe unsavable.
const INGREDIENT_CATEGORIES = [
  'Fruit & Vegetables',
  'Meat & Seafood',
  'Dairy',
  'Bakery',
  'Pantry',
  'Frozen Foods',
  'Canned Goods',
  'Deli',
  'Ready Meals',
];

const COOKING_METHODS = [
  'Bake', 'Boil', 'Fry', 'Grill', 'Roast', 'Sauté', 'Simmer', 'Steam',
  'Slow Cooking', 'Stir-Frying', 'Pressure Cooking', 'Air Frying',
  'Poaching', 'Smoking', 'Raw / No Cook',
];

const draftSchema = Joi.object({
  recipe_name: Joi.string().allow(null, ''),
  description: Joi.string().allow(null, ''),
  cuisine_name: Joi.string().allow(null, ''),
  cooking_method_name: Joi.string().allow(null, ''),
  meal_type: Joi.string().valid('breakfast', 'lunch', 'dinner', 'other').allow(null, ''),
  servings: Joi.number().allow(null),
  prep_time_minutes: Joi.number().allow(null),
  cook_time_minutes: Joi.number().allow(null),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').allow(null, ''),
  image_url: Joi.string().allow(null, ''),
  ingredients: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      quantity: Joi.number().allow(null),
      unit: Joi.string().allow(null, ''),
      notes: Joi.string().allow(null, ''),
      category: Joi.string().allow(null, ''),
    })
  ).required(),
  instructions: Joi.array().items(Joi.string()).required(),
}).unknown(true);

function buildMapPrompt(sourceRecipe) {
  return `You are a data mapping function. You convert one recipe record into another schema.

You MAP ONLY. You must never invent, estimate, enrich or improve any value.
Every value you output must be copied or restructured from the source below.
If the source does not contain a value, output null. Never guess nutrition.

Source recipe (JSON):
${JSON.stringify(sourceRecipe, null, 2)}

Return strict JSON only. No markdown, no commentary.

Target shape:
{
  "recipe_name": "string or null",
  "description": "string or null",
  "cuisine_name": "string or null",
  "cooking_method_name": "string or null",
  "meal_type": "breakfast|lunch|dinner|other or null",
  "servings": "number or null",
  "prep_time_minutes": "number or null",
  "cook_time_minutes": "number or null",
  "difficulty": "easy|medium|hard or null",
  "image_url": "string or null",
  "ingredients": [{"name": "string", "quantity": "number or null", "unit": "string or null", "notes": "string or null", "category": "string"}],
  "instructions": ["string"]
}

Mapping rules:
- ingredients: split the source measure into quantity (number) and unit (string). "1 pound" becomes quantity 1, unit "pound". If the measure has no number, quantity is null and the text goes in notes.
- ingredients[].category: classify each ingredient into exactly one of: ${INGREDIENT_CATEGORIES.join(', ')}. This is classification of the ingredient itself, not a claim about the source — "penne rigate" is Pantry, "chicken thighs" is Meat & Seafood, "basil" is Fruit & Vegetables. Always provide a category for every ingredient; use "Pantry" when genuinely unsure.
- instructions: split the source instruction text into individual steps. Keep the original wording. Do not add steps.
- cuisine_name: use the source area.
- cooking_method_name: identify the dish's PRIMARY cooking method from the cooking verbs actually used in the source instructions, and return the closest match from this list: ${COOKING_METHODS.join(', ')}. Only choose a method whose technique is genuinely described in the instructions — if the instructions describe boiling pasta and sauteing garlic, pick the one that defines the dish. If the instructions describe no cooking at all, use "Raw / No Cook". If you cannot tell, return null rather than guessing.
- Never output a value for calories, protein, fat or carbohydrates.`;
}

function extractJson(rawText) {
  if (typeof rawText !== 'string') return null;
  const withoutFences = rawText.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(withoutFences.slice(start, end + 1));
  } catch (_error) {
    return null;
  }
}

function parseMeasure(measure) {
  const text = typeof measure === 'string' ? measure.trim() : '';
  if (!text) return { quantity: null, unit: null, notes: null };

  const match = text.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*(.*)$/);
  if (!match) return { quantity: null, unit: null, notes: text };

  const [, rawQuantity, rest] = match;
  const quantity = rawQuantity.includes('/')
    ? Number(rawQuantity.split('/')[0]) / Number(rawQuantity.split('/')[1])
    : Number(rawQuantity);

  return { quantity, unit: rest.trim() || null, notes: null };
}

function splitInstructions(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  return text
    .split(/\r?\n+|(?<=\.)\s+(?=[A-Z])/)
    .map((step) => step.trim())
    .filter(Boolean);
}

function emptyDraft() {
  return TARGET_FIELDS.reduce((draft, field) => {
    draft[field] = field === 'ingredients' || field === 'instructions' ? [] : null;
    return draft;
  }, {});
}

function deterministicMap(sourceRecipe) {
  const draft = emptyDraft();

  draft.recipe_name = sourceRecipe.title || null;
  draft.cuisine_name = sourceRecipe.area || null;
  draft.image_url = sourceRecipe.thumbnail || null;
  draft.ingredients = (sourceRecipe.ingredients || []).map((item) => ({
    name: item.name,
    ...parseMeasure(item.measure),
    // No LLM in this path to classify with, so default to the safe bucket —
    // the row stays saveable and the user can correct it.
    category: 'Pantry',
  }));
  draft.instructions = splitInstructions(sourceRecipe.instructions);

  return draft;
}

function normalizeDraft(parsed) {
  const draft = emptyDraft();

  for (const field of TARGET_FIELDS) {
    if (NUTRITION_FIELDS.includes(field)) continue;
    const value = parsed[field];
    if (value === undefined || value === '') continue;
    draft[field] = value;
  }

  draft.ingredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients.map((item) => ({
        name: item.name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        notes: item.notes ?? null,
        // Only accept a category from the controlled vocabulary; anything else
        // falls back to Pantry so the row stays saveable.
        category: INGREDIENT_CATEGORIES.includes(item.category) ? item.category : 'Pantry',
      }))
    : [];
  draft.instructions = Array.isArray(parsed.instructions) ? parsed.instructions : [];

  return draft;
}

function computeUnmappedFields(draft) {
  return TARGET_FIELDS.filter((field) => {
    const value = draft[field];
    if (Array.isArray(value)) return value.length === 0;
    return value === null || value === undefined || value === '';
  });
}

function buildSourceMeta(sourceRecipe) {
  return {
    source: sourceRecipe.source,
    external_id: sourceRecipe.external_id,
    source_url: sourceRecipe.source_url || null,
    attribution: 'TheMealDB',
    license: 'Free with attribution',
  };
}

/**
 * OpenRouter generator (OpenAI-compatible chat completions over plain HTTP).
 *
 * Preferred when OPENROUTER_API_KEY is set: it avoids Gemini's free-tier
 * 5-requests-per-minute cap, which was the main source of fallbacks in
 * development.
 */
function openRouterGenerate() {
  const modelName = process.env.RECIPE_SOURCES_OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;

  return async (prompt) => {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: modelName,
        temperature: 0,
        messages: [
          { role: 'system', content: 'Return only valid JSON. No markdown. No explanations.' },
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          // OpenRouter uses these for attribution on its dashboard; optional.
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
          'X-Title': 'NutriHelp Recipe Sources',
        },
        timeout: LLM_TIMEOUT_MS,
      }
    );

    return response.data?.choices?.[0]?.message?.content || '';
  };
}

function geminiGenerate() {
  const modelName = process.env.RECIPE_SOURCES_GEMINI_MODEL || DEFAULT_MODEL;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0 },
  });

  return async (prompt) => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_RETRY_DELAY_MS = 15000;

const IMAGE_FETCH_TIMEOUT_MS = 10000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Fetches the source recipe's image server-side and returns it as a base64 data
 * URL, the format the existing save path already accepts (model/createRecipe.js
 * saveImage -> parseBase64Image).
 *
 * Done on the backend rather than in the browser because the source CDN's CORS
 * policy is not ours to depend on, and because every client (web, mobile, any
 * future integration) then gets the image without repeating this work.
 *
 * Returns null on any failure — a missing image must never fail a mapping.
 */
async function fetchImageAsDataUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: IMAGE_FETCH_TIMEOUT_MS,
      maxContentLength: MAX_IMAGE_BYTES,
      maxBodyLength: MAX_IMAGE_BYTES,
    });

    const contentType = String(response.headers['content-type'] || '').split(';')[0].trim();
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      logger.warn('[recipeSources][mapper] source image rejected: unexpected content type', {
        imageUrl,
        contentType,
      });
      return null;
    }

    const buffer = Buffer.from(response.data);
    if (buffer.length > MAX_IMAGE_BYTES) {
      logger.warn('[recipeSources][mapper] source image rejected: too large', {
        imageUrl,
        bytes: buffer.length,
      });
      return null;
    }

    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    logger.warn('[recipeSources][mapper] source image fetch failed', {
      imageUrl,
      error: error.message,
    });
    return null;
  }
}

/**
 * Pulls a retry delay out of a provider error. Gemini reports it as
 * `retryDelay: "6s"` in the RetryInfo block; OpenAI-compatible APIs use a
 * Retry-After header. Returns null when the error carries no guidance, and
 * caps the wait so a long backoff never strands the request.
 */
function parseRetryDelayMs(error) {
  const headerValue = error?.response?.headers?.['retry-after'];
  if (headerValue) {
    const seconds = Number(headerValue);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
    }
  }

  const match = /"?retryDelay"?[:\s]+"?(\d+(?:\.\d+)?)s/i.exec(error?.message || '');
  if (match) {
    return Math.min(Math.ceil(Number(match[1]) * 1000) + 500, MAX_RETRY_DELAY_MS);
  }

  return null;
}

/**
 * Picks the configured provider. OpenRouter wins when its key is present —
 * Gemini's free tier caps at 5 requests/minute, which produced most of the
 * deterministic fallbacks seen in development.
 */
function resolveProvider() {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      name: 'openrouter',
      model: process.env.RECIPE_SOURCES_OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
      generate: openRouterGenerate(),
    };
  }

  return {
    name: 'gemini',
    model: process.env.RECIPE_SOURCES_GEMINI_MODEL || DEFAULT_MODEL,
    generate: geminiGenerate(),
  };
}

async function mapRecipe(sourceRecipe, options = {}) {
  const provider = options.generate
    ? { name: 'injected', model: 'injected', generate: options.generate }
    : resolveProvider();
  const generate = provider.generate;
  const modelName = provider.model;
  const prompt = buildMapPrompt(sourceRecipe);
  const mapStartedAt = Date.now();

  const traceContext = {
    source: sourceRecipe.source,
    external_id: sourceRecipe.external_id,
    title: sourceRecipe.title,
  };

  logger.info('[recipeSources][mapper] start', {
    ...traceContext,
    provider: provider.name,
    model: modelName,
    promptChars: prompt.length,
    sourceIngredients: (sourceRecipe.ingredients || []).length,
  });

  let violations = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let parsed = null;
    const attemptStartedAt = Date.now();

    try {
      const rawText = await generate(prompt);
      const generateMs = Date.now() - attemptStartedAt;
      parsed = extractJson(rawText);

      logger.info('[recipeSources][mapper] llm responded', {
        ...traceContext,
        attempt,
        ms: generateMs,
        responseChars: typeof rawText === 'string' ? rawText.length : 0,
        parsed: Boolean(parsed),
      });
      logger.debug('[recipeSources][mapper] raw llm output', {
        ...traceContext,
        attempt,
        rawText: typeof rawText === 'string' ? rawText.slice(0, 2000) : rawText,
      });
    } catch (error) {
      // Provider errors are usually transient (503 "high demand" is common on
      // the flash models), so spend the remaining attempt rather than dropping
      // straight to the deterministic mapping.
      logger.warn('[recipeSources][mapper] provider error', {
        ...traceContext,
        attempt,
        ms: Date.now() - attemptStartedAt,
        error: error.message,
      });
      violations = [`provider error: ${error.message}`];

      // Rate-limit responses state how long to wait. Retrying instantly just
      // burns the second attempt inside the same quota window — which is
      // exactly what turned transient 429s into deterministic fallbacks.
      const retryDelayMs = parseRetryDelayMs(error);
      if (retryDelayMs && attempt < MAX_ATTEMPTS) {
        logger.info('[recipeSources][mapper] honouring provider retry delay', {
          ...traceContext,
          attempt,
          retryDelayMs,
        });
        await sleep(retryDelayMs);
      }
      continue;
    }

    if (!parsed) {
      logger.warn('[recipeSources][mapper] output not parseable as JSON', {
        ...traceContext,
        attempt,
      });
      continue;
    }

    const { error } = draftSchema.validate(parsed, { abortEarly: false });
    if (error) {
      violations = error.details.map((detail) => detail.message);
      logger.warn('[recipeSources][mapper] schema validation failed', {
        ...traceContext,
        attempt,
        violations: violations.slice(0, 5),
      });
      continue;
    }

    const draft = normalizeDraft(parsed);
    const fidelity = checkFidelity(draft, sourceRecipe);

    if (!fidelity.ok) {
      violations = fidelity.violations;
      logger.warn('[recipeSources][mapper] fidelity check rejected llm output', {
        ...traceContext,
        attempt,
        violations: violations.slice(0, 5),
      });
      continue;
    }

    const unmapped = computeUnmappedFields(draft);
    logger.info('[recipeSources][mapper] done', {
      ...traceContext,
      strategy: 'llm',
      attempt,
      ingredients: draft.ingredients.length,
      instructions: draft.instructions.length,
      unmappedCount: unmapped.length,
      totalMs: Date.now() - mapStartedAt,
    });

    return {
      draft,
      unmapped_fields: unmapped,
      source_meta: buildSourceMeta(sourceRecipe),
      source_image: await fetchImageAsDataUrl(draft.image_url || sourceRecipe.thumbnail),
      mapper: { strategy: 'llm', model: modelName, violations: [] },
    };
  }

  const draft = deterministicMap(sourceRecipe);
  const unmapped = computeUnmappedFields(draft);

  logger.warn('[recipeSources][mapper] done via deterministic fallback', {
    ...traceContext,
    strategy: 'fallback',
    attempts: MAX_ATTEMPTS,
    ingredients: draft.ingredients.length,
    instructions: draft.instructions.length,
    unmappedCount: unmapped.length,
    violations: violations.slice(0, 5),
    totalMs: Date.now() - mapStartedAt,
  });

  return {
    draft,
    unmapped_fields: unmapped,
    source_meta: buildSourceMeta(sourceRecipe),
    source_image: await fetchImageAsDataUrl(draft.image_url || sourceRecipe.thumbnail),
    mapper: { strategy: 'fallback', model: modelName, violations },
  };
}

module.exports = {
  TARGET_FIELDS,
  NUTRITION_FIELDS,
  COOKING_METHODS,
  buildMapPrompt,
  deterministicMap,
  mapRecipe,
  resolveProvider,
  extractJson,
  parseMeasure,
  splitInstructions,
};
