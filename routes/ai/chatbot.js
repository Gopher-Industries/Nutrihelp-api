const express = require('express');
const Groq = require('groq-sdk');
const { ChromaClient } = require('chromadb');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Settings (match Python ActiveAISettings defaults exactly) ---
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_TEMPERATURE = parseFloat(process.env.GROQ_TEMPERATURE || '0.0');
const GROQ_TOP_P = parseFloat(process.env.GROQ_TOP_P || '1.0');
const RAG_N_RESULTS = parseInt(process.env.RAG_N_RESULTS || '5');
const RAG_DISTANCE_THRESHOLD = parseFloat(process.env.RAG_DISTANCE_THRESHOLD || '0.8');
const RAG_RELAXED_DISTANCE_THRESHOLD = parseFloat(process.env.RAG_RELAXED_DISTANCE_THRESHOLD || '1.6');
const RAG_COLLECTION = process.env.RAG_COLLECTION || 'aus_food_nutrition';

// --- Exact system prompts from Python ---
const GROUNDING_SYSTEM_PROMPT =
  'You are NutriBot, a nutrition assistant.\n' +
  'Strict grounding rules (follow exactly):\n' +
  '1) Use ONLY the information provided in the context below.\n' +
  '2) Answer ONLY using the provided context.\n' +
  '3) Do not add information not present in the context.\n' +
  '4) Do not rephrase, embellish, or expand unnecessarily.\n' +
  '5) Be concise and direct.\n' +
  "6) If the context is insufficient, reply exactly: 'I don\\'t have enough information on that topic in my knowledge base.'";

const DOMAIN_CHAT_SYSTEM_PROMPT =
  'You are NutriBot, the NutriHelp assistant.\n' +
  'You only help with nutrition, meals, food choices, healthy eating, calorie guidance, nutrients, ' +
  'dietary habits, food scanning follow-up, and user health goals related to diet and lifestyle.\n' +
  'If the user asks something outside that scope, do not answer it as a general-purpose assistant. ' +
  'Instead, briefly explain that you focus on nutrition, meals, and healthy eating, then invite the user ' +
  'to ask a food or nutrition question.\n' +
  'Keep replies concise, practical, and friendly.';

const SAFE_REPLY = 'Nutribot is currently unavailable.';

const DOMAIN_REDIRECT_REPLY =
  "I'm here to help with nutrition, meals, healthy eating, and your food-related health goals. " +
  'Try asking about foods, calories, nutrients, meal ideas, or diet guidance.';

// --- Exact keyword lists from Python _is_nutrition_domain_prompt ---
const NUTRITION_KEYWORDS = [
  'nutrition', 'nutrient', 'nutrients', 'calorie', 'calories', 'protein', 'carb', 'carbs',
  'carbohydrate', 'carbohydrates', 'fat', 'fats', 'fibre', 'fiber', 'vitamin', 'vitamins',
  'mineral', 'minerals', 'iron', 'calcium', 'sodium', 'cholesterol', 'salt', 'sugar', 'food',
  'foods', 'meal', 'meals', 'meal plan', 'meal planning', 'diet', 'dietary', 'healthy eating',
  'weight loss', 'weight gain', 'breakfast', 'lunch', 'dinner', 'snack', 'snacks', 'recipe',
  'recipes', 'ingredient', 'ingredients', 'serving', 'portion', 'scan', 'dish', 'older adults',
  'seniors', 'hydration', 'water intake', 'diabetes', 'blood pressure', 'vegan', 'vegetarian',
  'keto', 'low-carb', 'high-protein', 'gluten-free', 'dairy-free', 'lactose-free', 'nut-free',
  'allergen', 'allergens', 'coeliac', 'celiac',
];

const FOOD_TERMS = [
  'fruit', 'fruits', 'vegetable', 'vegetables', 'berry', 'berries', 'strawberry', 'strawberries',
  'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'grape', 'grapes', 'avocado',
  'avocados', 'broccoli', 'carrot', 'carrots', 'spinach', 'salad', 'salads', 'rice', 'pasta',
  'bread', 'cereal', 'cereals', 'gluten', 'wheat', 'barley', 'rye', 'malt', 'flour', 'noodle',
  'noodles', 'oat', 'oats', 'oatmeal', 'yogurt', 'yoghurt', 'milk', 'cheese', 'egg', 'eggs',
  'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'sushi', 'sashimi', 'tofu', 'beans',
  'lentils', 'nuts', 'almonds', 'smoothie', 'smoothies', 'juice', 'water', 'coffee', 'tea',
  'ice cream', 'pizza', 'burger', 'hamburger',
];

const LIFESTYLE_TERMS = [
  'exercise', 'gym', 'workout', 'workouts', 'walking', 'hydration', 'sleep and diet',
];

const SENSITIVITY_KEYWORDS = [
  'allergy', 'allergies', 'allergic', 'intolerance', 'intolerant',
];

const COMMON_FOOD_ALLERGENS = [
  'peanut', 'nut', 'milk', 'dairy', 'egg', 'soy', 'sesame', 'fish', 'shellfish', 'lactose',
];

// --- Exact meta context markers from Python _looks_like_meta_context ---
const META_MARKERS = [
  'structured prompting approach',
  'content-type: application/json',
  'json body',
  'example successful response',
  'the recipe engine does not work directly',
  'langchain',
  'redis memory',
  'serp',
  'openai models',
];

// --- Exact weak response markers from Python _is_weak_rag_response ---
const WEAK_MARKERS = [
  "i don't know",
  'i do not know',
  'unable to verify',
  'unable to answer',
  'unable to confirm',
  'cannot verify',
  'not enough information',
  'insufficient information',
  'no relevant nutrition information',
  'knowledge base',
];

// --- Helper: word-boundary match (replicates Python re.search with \b) ---
function hasWordBoundaryTerm(terms, text) {
  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(text);
  });
}

// --- Exact _is_social_prompt logic ---
function isSocialPrompt(prompt) {
  const clean = (prompt || '').trim().toLowerCase();
  if (!clean) return false;
  const patterns = [
    /^(hi|hello|hey|good morning|good afternoon|good evening)\b/,
    /^(thanks|thank you|thx)\b/,
    /^(how are you|how are you doing)\b/,
  ];
  return patterns.some((p) => p.test(clean));
}

// --- Exact _is_nutrition_domain_prompt logic ---
function isNutritionDomainPrompt(prompt) {
  const clean = (prompt || '').trim().toLowerCase();
  if (!clean) return false;

  if (
    hasWordBoundaryTerm(NUTRITION_KEYWORDS, clean) ||
    hasWordBoundaryTerm(FOOD_TERMS, clean) ||
    hasWordBoundaryTerm(LIFESTYLE_TERMS, clean)
  ) return true;

  if (hasWordBoundaryTerm(SENSITIVITY_KEYWORDS, clean) && hasWordBoundaryTerm(COMMON_FOOD_ALLERGENS, clean))
    return true;

  const consumptionPatterns = [
    /\b(should|can)\s+i\s+(eat|drink|have)\s+[\w\s-]+\b/,
    /\b(is|are)\s+[\w\s-]+\s+(ok|okay|safe)\s+to\s+(eat|drink|have)\b/,
  ];
  if (consumptionPatterns.some((p) => p.test(clean))) return true;

  const foodHealthPatterns = [
    /\b(is|are)\s+[\w\s-]+\s+(healthy|good for (my|your|our)?\s*health)\b/,
    /\b(benefits?|nutrition facts?|nutritional value)\s+of\s+[\w\s-]+\b/,
    /\bwhat\s+(are|is)\s+the\s+(benefits?|nutrition|nutrients?)\s+of\s+[\w\s-]+\b/,
    /\bhow\s+(healthy|nutritious)\s+is\s+[\w\s-]+\b/,
  ];
  return hasWordBoundaryTerm(FOOD_TERMS, clean) && foodHealthPatterns.some((p) => p.test(clean));
}

// --- Exact _looks_like_meta_context logic ---
function looksLikeMetaContext(doc) {
  const lower = doc.toLowerCase();
  return META_MARKERS.some((m) => lower.includes(m));
}

// --- Exact _is_weak_rag_response logic ---
function isWeakRagResponse(response) {
  if (!response) return true;
  const clean = response.trim();
  if (!clean) return true;
  const lower = clean.toLowerCase();
  if (WEAK_MARKERS.some((m) => lower.includes(m))) return true;
  const veryShort = clean.length < 20;
  const hasNutritionalSignal = /\d|%|serving|vegetable|fruit|diet|nutrition|guideline/i.test(clean);
  return veryShort && !hasNutritionalSignal;
}

// --- ChromaDB client factory ---
function buildChromaClient() {
  return new ChromaClient({
    path: 'https://api.trychroma.com',
    auth: {
      provider: 'token',
      credentials: process.env.CHROMA_API_KEY,
      providerOptions: { headerType: 'X_CHROMA_TOKEN' },
    },
    tenant: process.env.CHROMA_TENANT,
    database: process.env.CHROMA_DATABASE,
  });
}

// --- Exact retrieve_ranked logic ---
async function retrieveRanked(query, limit) {
  limit = limit || RAG_N_RESULTS;
  const fetchLimit = Math.max(limit, limit * 3);
  try {
    const client = buildChromaClient();
    const collection = await client.getOrCreateCollection({ name: RAG_COLLECTION });
    const result = await collection.query({ queryTexts: [query], nResults: fetchLimit, include: ['documents', 'distances'] });
    const documents = result.documents?.[0] || [];
    const distances = result.distances?.[0] || [];

    const ranked = [];
    const seenDocs = new Set();
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const dist = distances[i];
      if (!doc || dist == null) continue;
      const normalized = doc.replace(/\s+/g, ' ').trim().toLowerCase();
      if (seenDocs.has(normalized)) continue;
      seenDocs.add(normalized);
      ranked.push({ doc, dist: parseFloat(dist) });
      if (ranked.length >= limit) break;
    }
    return ranked;
  } catch {
    return [];
  }
}

// --- Exact retrieve_for_rag logic ---
async function retrieveForRag(query, nResults, distanceThreshold, relaxedDistanceThreshold) {
  const limit = nResults || RAG_N_RESULTS;
  const strict = distanceThreshold != null ? distanceThreshold : RAG_DISTANCE_THRESHOLD;
  let relaxed = relaxedDistanceThreshold != null ? relaxedDistanceThreshold : RAG_RELAXED_DISTANCE_THRESHOLD;
  if (relaxed < strict) relaxed = strict;

  let ranked = await retrieveRanked(query, limit);
  if (!ranked.length) return [];

  // Filter meta contexts
  const filtered = ranked.filter(({ doc }) => !looksLikeMetaContext(doc));
  if (!filtered.length) return [];
  ranked = filtered;

  // Strict threshold first
  const strictContexts = ranked.filter(({ dist }) => dist <= strict).map(({ doc }) => doc);
  if (strictContexts.length) return strictContexts;

  // Relaxed threshold fallback
  const relaxedContexts = ranked.filter(({ dist }) => dist <= relaxed).map(({ doc }) => doc);
  if (relaxedContexts.length) return relaxedContexts;

  return [];
}

// --- Simple retrieve (no distance filtering, used by health plan) ---
async function retrieve(query, nResults) {
  nResults = nResults || 4;
  try {
    const client = buildChromaClient();
    const collection = await client.getOrCreateCollection({ name: RAG_COLLECTION });
    const result = await collection.query({ queryTexts: [query], nResults });
    return result.documents?.[0] || [];
  } catch {
    return [];
  }
}

// --- Groq chat ---
async function chat(prompt, systemPrompt, temperature) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const temp = temperature != null ? temperature : GROQ_TEMPERATURE;
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const res = await groq.chat.completions.create({
    messages,
    model: GROQ_MODEL,
    temperature: temp,
    top_p: GROQ_TOP_P,
  });
  return res.choices[0]?.message?.content || SAFE_REPLY;
}

// --- Exact _build_grounded_user_prompt ---
function buildGroundedUserPrompt(contexts, question) {
  const joinedContext = contexts.join('\n\n');
  return `CONTEXT:\n${joinedContext}\n\nQUESTION: ${question}\n\nAnswer using only the provided context.`;
}

// --- Exact _chat_with_domain_guard ---
async function chatWithDomainGuard(prompt) {
  if (isSocialPrompt(prompt)) {
    return chat(prompt, DOMAIN_CHAT_SYSTEM_PROMPT);
  }
  if (!isNutritionDomainPrompt(prompt)) {
    return DOMAIN_REDIRECT_REPLY;
  }
  return chat(prompt, DOMAIN_CHAT_SYSTEM_PROMPT);
}

// --- Exact chat_with_rag_fallback (used by POST /chat) ---
async function chatWithRagFallback(prompt) {
  const contexts = await retrieveForRag(prompt, RAG_N_RESULTS, RAG_DISTANCE_THRESHOLD, RAG_RELAXED_DISTANCE_THRESHOLD);

  if (!contexts.length) {
    return chatWithDomainGuard(prompt);
  }

  const grounded = buildGroundedUserPrompt(contexts, prompt);
  const ragResponse = await chat(grounded, GROUNDING_SYSTEM_PROMPT, 0.0);

  if (isWeakRagResponse(ragResponse)) {
    return chatWithDomainGuard(prompt);
  }

  return ragResponse;
}

// --- Exact generate_with_rag (used by POST /chat_with_rag) ---
async function generateWithRag(prompt) {
  const contexts = await retrieveForRag(prompt);
  if (!contexts.length) {
    return (
      "I'm sorry, I could not find relevant nutrition information for your question. " +
      'Please try asking about specific foods, nutrients, or dietary guidelines for Australian seniors.'
    );
  }
  const grounded = buildGroundedUserPrompt(contexts, prompt);
  return chat(grounded, GROUNDING_SYSTEM_PROMPT, 0.0);
}

// --- Routes ---

// POST /ai-model/chatbot/chat
router.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || String(query).trim().length === 0) {
      return res.status(400).json({ status: 'error', error: 'query is required' });
    }
    const msg = await chatWithRagFallback(String(query).trim());
    res.json({ status: 'success', msg, id: uuidv4(), timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', error: 'Internal Server Error', detail: String(e.message), timestamp: new Date().toISOString() });
  }
});

// POST /ai-model/chatbot/chat_with_rag
router.post('/chat_with_rag', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || String(query).trim().length === 0) {
      return res.status(400).json({ status: 'error', error: 'query is required' });
    }
    const msg = await generateWithRag(String(query).trim());
    res.json({ status: 'success', msg, id: uuidv4(), timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', error: 'Internal Server Error', detail: String(e.message), timestamp: new Date().toISOString() });
  }
});

// POST /ai-model/chatbot/transcribe  (multipart/form-data, field name: "audio")
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Could not transcribe audio.' });
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const transcription = await groq.audio.transcriptions.create({
      model: 'whisper-large-v3',
      file: new File([req.file.buffer], 'recording.webm', { type: 'audio/webm' }),
    });
    if (!transcription.text?.trim()) return res.status(400).json({ error: 'Could not transcribe audio.' });
    res.json({ transcript: transcription.text });
  } catch (e) {
    res.status(500).json({ error: `Transcription error: ${e.message}` });
  }
});

module.exports = router;
module.exports.retrieve = retrieve;
