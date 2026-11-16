'use strict';

/**
 * AI layer for the Health Assessment (FE-04).
 *
 * Two independent AI calls, each with its own timeout and fallback:
 *
 *  1. Model predictions: the NutriHelp medical-report model (obesity level and
 *     diabetes classification) via the existing MedicalPredictionService.
 *  2. Narrative: a short, personalised summary written by an LLM (Groq, then
 *     Gemini) from the computed scores only. No identifiers, and no free text
 *     from the user, ever reach the prompt.
 *
 * Neither call can fail the assessment. If the model is unreachable the result
 * says so (`available: false`) and the rules engine carries the assessment; if
 * the LLM is unavailable a deterministic summary is written instead. The
 * frontend shows which path was used, so the user is never told "AI" did
 * something it did not.
 */

const logger = require('../../utils/logger');
const { MedicalPredictionService } = require('../medicalPredictionService');
const { toAiSurvey } = require('./questionnaire');
const { DOMAIN_LABELS } = require('./scoringEngine');

const MODEL_TIMEOUT_MS = Number(process.env.HEALTH_ASSESSMENT_MODEL_TIMEOUT_MS) || 8000;
const NARRATIVE_TIMEOUT_MS = Number(process.env.HEALTH_ASSESSMENT_NARRATIVE_TIMEOUT_MS) || 12000;

const OBESITY_LABELS = {
  Insufficient_Weight: 'Insufficient weight',
  Normal_Weight: 'Normal weight',
  Overweight_Level_I: 'Overweight (level I)',
  Overweight_Level_II: 'Overweight (level II)',
  Obesity_Type_I: 'Obesity (type I)',
  Obesity_Type_II: 'Obesity (type II)',
  Obesity_Type_III: 'Obesity (type III)',
};

const OBESITY_TO_BMI_KEY = {
  Insufficient_Weight: 'underweight',
  Normal_Weight: 'healthy',
  Overweight_Level_I: 'overweight',
  Overweight_Level_II: 'overweight',
  Obesity_Type_I: 'obese_1',
  Obesity_Type_II: 'obese_2',
  Obesity_Type_III: 'obese_3',
};

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Confidence may arrive as 0-1 or 0-100 depending on the model version. */
function toPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n <= 1 ? n * 100 : n);
}

function isPositive(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return ['true', 'yes', 'positive', 'detected', '1'].includes(String(value || '').trim().toLowerCase());
}

function normaliseModelReport(report, engineResult) {
  const obesity = report.obesity_prediction || report.obesityPrediction || {};
  const diabetes = report.diabetes_prediction || report.diabetesPrediction || {};
  const obesityLevel = obesity.obesity_level || obesity.obesityLevel || null;

  const engineBmiKey = engineResult.body.bmiCategory.key;
  const modelBmiKey = OBESITY_TO_BMI_KEY[obesityLevel];

  return {
    obesity: obesityLevel
      ? {
        level: obesityLevel,
        label: OBESITY_LABELS[obesityLevel] || obesityLevel.replace(/_/g, ' '),
        confidence: toPercent(obesity.confidence),
        agreesWithBmi: modelBmiKey ? modelBmiKey === engineBmiKey : null,
      }
      : null,
    diabetes:
      diabetes && diabetes.diabetes !== undefined
        ? {
          positive: isPositive(diabetes.diabetes),
          confidence: toPercent(diabetes.confidence),
          agreesWithScreening:
            isPositive(diabetes.diabetes) === (engineResult.diabetesRisk.level.key !== 'low'),
        }
        : null,
  };
}

/**
 * Ask the NutriHelp AI model for predictions.
 * An injected fetch is always used so the prediction service raises on failure
 * instead of silently returning its local estimate; that lets us report the
 * true source to the user.
 */
async function getModelPredictions(answers, engineResult, deps = {}) {
  const service = deps.predictionService || new MedicalPredictionService();
  const baseFetch = deps.fetch || global.fetch;

  if (typeof baseFetch !== 'function') {
    return { available: false, source: 'rules_engine', reason: 'fetch unavailable' };
  }

  const timedFetch = (url, init = {}) =>
    baseFetch(url, { ...init, signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) });

  try {
    const result = await withTimeout(
      service.predict(toAiSurvey(answers), { fetch: timedFetch }),
      MODEL_TIMEOUT_MS + 500,
      'Medical prediction model'
    );
    const report = result?.body?.medical_report;
    if (!report) throw new Error('Model returned no medical_report');

    return {
      available: true,
      source: 'nutrihelp_ai_model',
      model: 'NutriHelp medical-report model',
      ...normaliseModelReport(report, engineResult),
    };
  } catch (error) {
    logger.warn('Health assessment: AI model unavailable, using rules engine only', {
      reason: error.message,
    });
    return { available: false, source: 'rules_engine', reason: 'AI model unavailable' };
  }
}

// ---------------------------------------------------------------------------
// Narrative
// ---------------------------------------------------------------------------

const NARRATIVE_SYSTEM_PROMPT = `You are a warm, evidence-based Australian accredited practising dietitian.
You write a short personalised summary of a wellbeing screening for the person who completed it.
Rules:
- Address the person as "you". Plain English, encouraging, never alarming or judgemental.
- Use ONLY the facts provided. Do not invent numbers, diagnoses or conditions.
- Never diagnose. If a risk is high, recommend seeing a GP.
- Respond with ONLY valid JSON: {"headline": string (max 12 words), "summary": string (2-3 sentences, max 70 words), "motivation": string (1 sentence)}`;

function buildNarrativeFacts(engineResult, answers) {
  const { overall, body, targets, diabetesRisk, domains, riskFlags, recommendations } = engineResult;
  return {
    goal: answers.primaryGoal,
    ageBand: `${Math.floor(answers.age / 10) * 10}s`,
    overallScore: overall.score,
    overallBand: overall.band.label,
    bmi: body.bmi,
    bmiCategory: body.bmiCategory.label,
    diabetesScreening: diabetesRisk.level.label,
    domainScores: Object.fromEntries(domains.map((d) => [d.label, d.score])),
    topRisks: riskFlags.slice(0, 3).map((f) => f.title),
    topActions: recommendations.slice(0, 3).map((r) => r.title),
    dailyCalories: targets.calories,
    dailyWaterLitres: targets.waterLitres,
  };
}

function templateNarrative(engineResult) {
  const { overall, domains, recommendations } = engineResult;
  const sorted = [...domains].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const firstAction = recommendations[0];

  const headline = {
    excellent: 'You have an excellent health foundation',
    good: 'You are in good shape with room to grow',
    fair: 'A solid start with clear areas to improve',
    attention: 'A few changes could make a big difference',
    priority: 'Now is a great time to prioritise your health',
  }[overall.band.key];

  return {
    headline,
    summary:
      `Your overall wellness score is ${overall.score} out of 100. ` +
      `Your strongest area is ${best.label.toLowerCase()} (${best.score}), ` +
      `while ${weakest.label.toLowerCase()} (${weakest.score}) offers the biggest opportunity. ` +
      (firstAction ? `Start with this: ${firstAction.title.toLowerCase()}.` : ''),
    motivation: 'Small, consistent changes add up. Reassess in 4 to 6 weeks to see your progress.',
    source: 'template',
  };
}

function parseNarrative(text) {
  const match = String(text || '').replace(/```json|```/gi, '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in narrative response');
  const parsed = JSON.parse(match[0]);
  const clean = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const narrative = {
    headline: clean(parsed.headline, 120),
    summary: clean(parsed.summary, 600),
    motivation: clean(parsed.motivation, 240),
  };
  if (!narrative.headline || !narrative.summary) throw new Error('Narrative missing fields');
  return narrative;
}

async function callGroq(userMessage) {
  const Groq = require('groq-sdk');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: NARRATIVE_TIMEOUT_MS });
  const response = await groq.chat.completions.create({
    model: process.env.HEALTH_ASSESSMENT_GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.4,
    max_tokens: 300,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  });
  return { text: response.choices[0]?.message?.content, model: 'groq' };
}

async function callGemini(userMessage) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.HEALTH_ASSESSMENT_GEMINI_MODEL || 'gemini-2.5-flash',
    systemInstruction: NARRATIVE_SYSTEM_PROMPT,
  });
  const result = await model.generateContent(userMessage);
  return { text: result.response.text(), model: 'gemini' };
}

async function getNarrative(engineResult, answers, deps = {}) {
  const providers = deps.narrativeProviders || [
    process.env.GROQ_API_KEY && callGroq,
    process.env.GEMINI_API_KEY && callGemini,
  ].filter(Boolean);

  if (!providers.length) return templateNarrative(engineResult);

  const userMessage = `Screening results:\n${JSON.stringify(buildNarrativeFacts(engineResult, answers), null, 2)}`;

  for (const provider of providers) {
    try {
      const { text, model } = await withTimeout(provider(userMessage), NARRATIVE_TIMEOUT_MS, 'Narrative');
      return { ...parseNarrative(text), source: 'llm', model };
    } catch (error) {
      logger.warn('Health assessment narrative provider failed', { reason: error.message });
    }
  }
  return templateNarrative(engineResult);
}

module.exports = {
  getModelPredictions,
  getNarrative,
  templateNarrative,
  parseNarrative,
  buildNarrativeFacts,
  normaliseModelReport,
  DOMAIN_LABELS,
};
