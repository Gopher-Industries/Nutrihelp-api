const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

const SYSTEM_PROMPT = `You are a clinical nutritionist and registered dietitian specialising in geriatric and elderly nutrition.
 Respond with ONLY valid JSON — no markdown, no backticks, no explanation.
 Generate a 7-day meal plan (Monday–Sunday) with breakfast, lunch, and dinner each day.

 ELDERLY NUTRITION GUIDELINES YOU MUST FOLLOW:
 - Prioritise nutrient-dense meals; elderly adults need fewer calories but MORE nutrients per calorie.
 - Protein: include at least 25–30g per meal to combat sarcopenia (age-related muscle loss).
 - Calcium & Vitamin D: include dairy, fortified foods, or leafy greens daily for bone health.
 - Keep sodium under 1500mg per day total across all meals (hypertension risk).
 - Include high-fibre foods (vegetables, legumes, whole grains) for digestive health and blood sugar control.
 - Include omega-3 sources (oily fish, walnuts, flaxseed) at least 3 times across the week for heart and cognitive health.
 - Avoid tough, hard-to-chew foods unless mealTexture is "regular"; prefer tender, moist, or soft preparations.
 - Keep cooking steps simple — elderly users may have limited energy or mobility.
 - Portion sizes should be moderate; avoid overwhelming large meals.
 - If health conditions include "diabetes": limit added sugars and refined carbohydrates, favour low-GI foods.
 - If health conditions include "hypertension": strict low-sodium, include potassium-rich foods (bananas, sweet potato, spinach).
 - If health conditions include "osteoporosis": maximise calcium and Vitamin D in every meal.
 - If health conditions include "kidney_disease": limit potassium, phosphorus, and protein per KDOQI guidelines.
 - If health conditions include "heart_disease": low saturated fat, no trans fat, high omega-3.
 - If health conditions include "constipation": high fibre, high fluid-content foods daily.
 - If health conditions include "dysphagia": all meals must be soft/pureed, no raw hard vegetables or whole nuts.
 - Strictly exclude any allergens listed by the user.
 - No meal name should repeat across the 7 days.
 - Calories per day should be within 10% of the user's daily calorie target.

 Each meal must include: name, description, calories, proteins, fats, vitamins, sodium, fiber,
 and an ingredients array of {item, amount} objects with 4–8 ingredients.

 Return ONLY this JSON shape:
 {
   plan: [
     {
       day: "Monday",
       breakfast: { name, description, calories, proteins, fats, vitamins, sodium, fiber, ingredients: [{item, amount}] },
       lunch: { ...same },
       dinner: { ...same }
     },
     ...7 days total
   ]
 }`;

function buildUserMessage(filters) {
  return `Diet type: ${filters.dietType || 'balanced'}
Goal: ${filters.goal || 'maintain weight'}
Allergies: ${filters.allergies?.join(', ') || 'none'}
Daily calorie target: ${filters.calorieTarget || 1800}kcal
Cuisine preference: ${filters.cuisine || 'any'}
Health conditions: ${filters.healthConditions?.join(', ') || 'none'}
Meal texture: ${filters.mealTexture || 'regular'} (regular = normal food, soft = tender/moist preparations, pureed = fully blended)
Mobility level: ${filters.mobilityLevel || 'sedentary'} (affects calorie burn and portion sizing)
Cooking complexity: ${filters.cookingComplexity || 'simple'} (simple = under 30 min, few steps; moderate = standard home cooking)
Portion size preference: ${filters.portionSize || 'medium'}
Additional notes: ${filters.additionalNotes || 'none'}`;
}

const AI_TIMEOUT_MS = 30000;

function withTimeout(promise, ms, label) {
  const timer = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timer]);
}

async function generateWithGemini(userMessage) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Try 2.5-flash first; fall back to 1.5-flash if it times out or errors
  for (const modelName of ['gemini-2.5-flash', 'gemini-2.0-flash']) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
      });
      const result = await withTimeout(
        model.generateContent(userMessage),
        AI_TIMEOUT_MS,
        `Gemini(${modelName})`
      );
      return result.response.text();
    } catch (err) {
      console.warn(`Gemini model ${modelName} failed:`, err.message);
    }
  }
  throw new Error('All Gemini models failed');
}

async function generateWithGroq(userMessage) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: AI_TIMEOUT_MS });
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  });
  return response.choices[0].message.content;
}

async function generateMealPlan(filters) {
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    throw new Error('AI service not configured');
  }

  const userMessage = buildUserMessage(filters);

  const candidates = [];
  if (process.env.GEMINI_API_KEY) {
    candidates.push(
      generateWithGemini(userMessage).then(text => ({ text, model: 'gemini-2.5-flash' }))
    );
  }
  if (process.env.GROQ_API_KEY) {
    candidates.push(
      generateWithGroq(userMessage).then(text => ({ text, model: 'llama-3.3-70b-versatile' }))
    );
  }

  let winner;
  try {
    winner = await Promise.any(candidates);
  } catch (err) {
    const reasons = err.errors?.map(e => e.message).join(' | ') ?? err.message;
    console.error('All AI providers failed:', reasons);
    throw new Error('AI generation failed, please try again');
  }

  const { text: rawText, model: aiModelUsed } = winner;

  if (!rawText) {
    throw new Error('AI generation failed, please try again');
  }

  // Strip markdown fences and any surrounding text, then extract the JSON object
  let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  // If the model added explanation text, pull out the first { ... } block
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('JSON parse failed. Raw text:', rawText.substring(0, 500));
    throw new Error('AI returned invalid response, please try again');
  }

  return { parsed, aiModelUsed };
}

module.exports = { generateMealPlan };
