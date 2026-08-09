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
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { checkFidelity } = require('./fidelity');

const DEFAULT_MODEL = 'gemini-flash-latest';
const MAX_ATTEMPTS = 2;

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
  "ingredients": [{"name": "string", "quantity": "number or null", "unit": "string or null", "notes": "string or null"}],
  "instructions": ["string"]
}

Mapping rules:
- ingredients: split the source measure into quantity (number) and unit (string). "1 pound" becomes quantity 1, unit "pound". If the measure has no number, quantity is null and the text goes in notes.
- instructions: split the source instruction text into individual steps. Keep the original wording. Do not add steps.
- cuisine_name: use the source area. cooking_method_name: only if the source states one, otherwise null.
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

function defaultGenerate() {
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

async function mapRecipe(sourceRecipe, options = {}) {
  const generate = options.generate || defaultGenerate();
  const modelName = process.env.RECIPE_SOURCES_GEMINI_MODEL || DEFAULT_MODEL;
  const prompt = buildMapPrompt(sourceRecipe);

  let violations = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let parsed = null;
    try {
      parsed = extractJson(await generate(prompt));
    } catch (error) {
      console.warn(`[recipeSources] mapper attempt ${attempt} failed:`, error.message);
      break;
    }

    if (!parsed) continue;

    const { error } = draftSchema.validate(parsed, { abortEarly: false });
    if (error) {
      violations = error.details.map((detail) => detail.message);
      continue;
    }

    const draft = normalizeDraft(parsed);
    const fidelity = checkFidelity(draft, sourceRecipe);
    if (!fidelity.ok) {
      violations = fidelity.violations;
      continue;
    }

    return {
      draft,
      unmapped_fields: computeUnmappedFields(draft),
      source_meta: buildSourceMeta(sourceRecipe),
      mapper: { strategy: 'llm', model: modelName, violations: [] },
    };
  }

  const draft = deterministicMap(sourceRecipe);
  return {
    draft,
    unmapped_fields: computeUnmappedFields(draft),
    source_meta: buildSourceMeta(sourceRecipe),
    mapper: { strategy: 'fallback', model: modelName, violations },
  };
}

module.exports = {
  TARGET_FIELDS,
  NUTRITION_FIELDS,
  buildMapPrompt,
  deterministicMap,
  mapRecipe,
  extractJson,
  parseMeasure,
  splitInstructions,
};
