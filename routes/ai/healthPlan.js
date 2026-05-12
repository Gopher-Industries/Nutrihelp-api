const express = require('express');
const Groq = require('groq-sdk');
const { retrieve } = require('./chatbot');

const router = express.Router();

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// --- Exact STRICT_SCHEMA_EXAMPLE from Python ---
const STRICT_SCHEMA_EXAMPLE = {
  suggestion: 'string',
  weekly_plan: [
    {
      week: 1,
      target_calories_per_day: 2000,
      focus: 'string',
      workouts: ['string'],
      meal_notes: 'string',
      reminders: ['string'],
    },
  ],
  progress_analysis: 'string',
};

const ALLOWED_FOCUS = new Set(['Weight Loss', 'Muscle Gain', 'Endurance']);
const CAL_MIN = 1200;
const CAL_MAX = 3500;

// --- Exact _clean_str ---
function cleanStr(value) {
  return String(value == null ? '' : value).trim();
}

// --- Exact _clean_str_list ---
function cleanStrList(values) {
  if (Array.isArray(values)) return values.map((v) => cleanStr(v)).filter((v) => v.length > 0);
  if (typeof values === 'string' && values.trim()) return [values.trim()];
  return [];
}

// --- Exact _coerce_int ---
function coerceInt(value, defaultVal) {
  try {
    const parsed = parseInt(parseFloat(String(value)));
    if (isNaN(parsed)) return defaultVal;
    return Math.max(CAL_MIN, Math.min(CAL_MAX, parsed));
  } catch {
    return defaultVal;
  }
}

// --- Exact _normalize_week_item ---
function normalizeWeekItem(index, item) {
  item = item || {};
  const focus = ALLOWED_FOCUS.has(item.focus) ? item.focus : 'Weight Loss';
  let workouts = cleanStrList(item.workouts || []);
  const mealNotes = cleanStr(item.meal_notes || '');
  const reminders = cleanStrList(item.reminders || []);

  // If workouts exist but none contain ":", prepend day names
  if (workouts.length > 0 && !workouts[0].includes(':')) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    workouts = workouts.map((w, offset) => `${days[offset % 7]}: ${w}`);
  }

  return {
    week: index + 1,
    target_calories_per_day: coerceInt(item.target_calories_per_day, 1900),
    focus,
    workouts: workouts.slice(0, 7).length
      ? workouts.slice(0, 7)
      : ['Monday: 30 minutes brisk walking', 'Wednesday: Rest day', 'Friday: 20 minutes strength training'],
    meal_notes: mealNotes || 'Eat 3 main meals and 2 snacks, include lean protein, whole grains, and healthy fats.',
    reminders: reminders.slice(0, 6).length
      ? reminders.slice(0, 6)
      : ['Drink 8 glasses of water daily', 'Limit sugary drinks and fast food'],
  };
}

// --- Exact _force_json ---
function forceJson(text) {
  const match = text.match(/\{[\s\S]*\}\s*$/);
  let raw = match ? match[0] : text;
  // Remove trailing commas before ] or }
  raw = raw.replace(/,(\s*[\]}])/g, '$1');

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { suggestion: String(text).trim(), weekly_plan: [], progress_analysis: '' };
  }

  // Unwrap nested JSON in suggestion field
  if (typeof data.suggestion === 'string' && data.suggestion.includes('{') && data.suggestion.includes('}')) {
    try {
      const inner = JSON.parse(data.suggestion);
      if (inner && typeof inner === 'object') {
        for (const key of ['suggestion', 'weekly_plan', 'progress_analysis']) {
          if (key in inner && !(key in data)) data[key] = inner[key];
        }
      }
    } catch {
      // ignore
    }
  }

  return data;
}

// --- Exact _enforce_schema ---
function enforceSchema(data, numWeeks) {
  let suggestion = cleanStr(data.suggestion || '');
  if (suggestion.includes('{') && suggestion.includes('}')) {
    suggestion = 'Increase daily water intake to 2 liters and consume 5 servings of fruits and vegetables.';
  }

  let weeklyPlan = Array.isArray(data.weekly_plan) ? data.weekly_plan : [];
  const normalizedItems = [];
  for (let i = 0; i < numWeeks; i++) {
    const base = (i < weeklyPlan.length && typeof weeklyPlan[i] === 'object') ? weeklyPlan[i] : {};
    normalizedItems.push(normalizeWeekItem(i, base));
  }

  let progressAnalysis = cleanStr(data.progress_analysis || '');
  if (!progressAnalysis) {
    progressAnalysis = 'Progress trend: steady adherence recommended. Track weight, BMI, and blood pressure weekly.';
  }

  return { suggestion, weekly_plan: normalizedItems, progress_analysis: progressAnalysis };
}

// --- Exact _build_prompt (note: {n} in rules is intentionally literal, not substituted) ---
function buildPrompt(analyzedCondition, numWeeks, ragContexts) {
  const conditionJson = JSON.stringify(analyzedCondition, null, 2);
  const schemaJson = JSON.stringify(STRICT_SCHEMA_EXAMPLE, null, 2);
  const joinedContext = ragContexts.length ? '\n- ' + ragContexts.join('\n- ') : '';

  return (
    'You are a nutrition and fitness assistant.\n' +
    'OUTPUT RULES (READ CAREFULLY):\n' +
    '1) Output MUST be a single valid JSON object. No prose, no code fences.\n' +
    '2) Allowed top-level keys ONLY: "suggestion", "weekly_plan", "progress_analysis".\n' +
    '3) Types:\n' +
    '   - suggestion: string (one sentence). It MUST NOT contain JSON or braces.\n' +
    '   - weekly_plan: array of exactly {n} objects, with keys:\n' +
    '       week (int 1..{n}), target_calories_per_day (int), focus (string: Weight Loss|Muscle Gain|Endurance),\n' +
    '       workouts (array of strings), meal_notes (string), reminders (array of strings)\n' +
    '   - progress_analysis: string (short paragraph)\n' +
    '4) Keep workouts/reminders as short bullet-like strings.\n' +
    '5) Use realistic AU norms (hydration, calories, macros) when relevant.\n' +
    '6) Do not include any extra keys anywhere.\n' +
    '7) Produce exactly {n} items in weekly_plan with weeks numbered 1..{n}.\n' +
    '\nSTRICT SHAPE EXAMPLE (TYPES ONLY, NOT CONTENT):\n' +
    schemaJson + '\n' +
    '\nUSER CONDITION HISTORY:\n' +
    conditionJson + '\n' +
    '\nRAG CONTEXT (Australian norms):\n' +
    joinedContext + '\n'
  );
}

// POST /ai-model/medical-report/plan/generate
router.post('/generate', async (req, res) => {
  try {
    const { medical_report, health_goal } = req.body;
    if (!medical_report || !health_goal) {
      return res.status(400).json({ error: 'medical_report and health_goal are required' });
    }

    const numWeeks = 8;
    const analyzed = { medical_report, health_goal, health_survey: null, followup_qa: null };

    // Build the same query string as Python _build_prompt
    const userTask =
      `Generate a ${numWeeks}-week diet & workout plan and analyze progress across reports. ` +
      'If multiple reports are given, compare them and include improvement/no-improvement notes ' +
      "in the 'progress_analysis' field. Return STRICT JSON only.";
    const conditionJson = JSON.stringify(analyzed, null, 2);
    const ragQuery = `${userTask}\nUser condition history: ${conditionJson}`;

    // Uses simple retrieve (no distance threshold), exactly like Python HealthPlanService
    const ragContexts = await retrieve(ragQuery, 4);
    const prompt = buildPrompt(analyzed, numWeeks, ragContexts);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You output strictly valid JSON.' },
        { role: 'user', content: prompt },
      ],
      model: GROQ_MODEL,
      max_tokens: 1200,
      temperature: 0.2,
    });

    const output = (response.choices[0]?.message?.content || '').trim();
    const parsed = forceJson(output);
    res.json(enforceSchema(parsed, numWeeks));
  } catch (e) {
    res.status(500).json({ error: 'Plan generation failed due to server error.', detail: e.message });
  }
});

module.exports = router;
