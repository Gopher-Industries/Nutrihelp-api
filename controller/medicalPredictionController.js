// controller/obesity.controller.js

// Node 18+ has global fetch; if you're on Node 16, uncomment:
// const fetch = require("node-fetch");

const { insertSurvey } = require("../model/healthSurveyModel");
const { insertRiskReport } = require("../model/healthRiskReportModel");

const AI_RETRIEVE_URL =
  process.env.AI_RETRIEVE_URL ||
  "http://localhost:8000/ai-model/medical-report/retrieve";

// ---------- helpers ----------
const lower = (v) => (typeof v === "string" ? v.trim().toLowerCase() : v);

const toYesNoStr = (v) => {
  const s = lower(v);
  if (["yes", "y", "true", "1", 1, true].includes(s)) return "yes";
  if (["no", "n", "false", "0", 0, false].includes(s)) return "no";
  return undefined;
};

const to01Int = (v) => {
  const s = lower(v);
  if (["yes", "y", "true", "1", 1, true].includes(s)) return 1;
  if (["no", "n", "false", "0", 0, false].includes(s)) return 0;
  const n = Number(v);
  if (Number.isFinite(n)) {
    if (n > 1) return 1; // e.g., FAVC=3900 -> treat as "yes"
    if (n === 0) return 0;
  }
  return undefined;
};

const normalizeGender = (v) => {
  const s = lower(v);
  if (s === "male" || s === "m" || v === 1 || v === "1") return 1;
  if (s === "female" || s === "f" || v === 2 || v === "2") return 2;
  return undefined;
};

const normalizeEnum = (v, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : undefined;
};

const ALLOWED_MTRANS = new Set([
  "Walking",
  "Bike",
  "Public_Transportation",
  "Automobile",
  "Motorbike",
]);

const normalizeMTRANS = (v) => {
  if (v == null) return undefined;
  const l = String(v).trim().toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ");
  if (l === "walking" || l === "walk") return "Walking";
  if (l === "bike" || l === "bicycle") return "Bike";
  if (l === "public transportation" || l === "public_transportation" || l === "public" || l === "bus" || l === "train")
    return "Public_Transportation";
  if (l === "automobile" || l === "car") return "Automobile";
  if (l === "motorbike" || l === "motorcycle") return "Motorbike";
  return ALLOWED_MTRANS.has(v) ? v : undefined;
};

function validateEncoded(enc) {
  const errs = {};
  if (![1, 2].includes(enc.Gender)) errs.Gender = "Expected 1 (Male) or 2 (Female).";
  if (!(enc.Age > 0 && enc.Age < 120)) errs.Age = "Age must be 0-120.";
  if (!(enc.Height > 0.5 && enc.Height < 2.5)) errs.Height = "Height must be 0.5-2.5 m.";
  if (!(enc.Weight > 10 && enc.Weight < 300)) errs.Weight = "Weight must be 10-300 kg.";
  if (!["yes", "no"].includes(enc.family_history_with_overweight)) errs.family_history_with_overweight = "Expected yes/no.";
  if (![0, 1].includes(enc.FAVC)) errs.FAVC = "Expected 0/1.";
  if (!(enc.FCVC >= 0 && enc.FCVC <= 5)) errs.FCVC = "Expected 0..5.";
  if (!(enc.NCP >= 0 && enc.NCP <= 10)) errs.NCP = "Expected 0..10.";
  if (![0, 1, 2, 3].includes(enc.CAEC)) errs.CAEC = "Expected 0..3.";
  if (![0, 1].includes(enc.SMOKE)) errs.SMOKE = "Expected 0/1.";
  if (!(enc.CH2O >= 0 && enc.CH2O <= 10)) errs.CH2O = "Expected 0..10.";
  if (!["yes", "no"].includes(enc.SCC)) errs.SCC = "Expected yes/no.";
  if (!(enc.FAF >= 0 && enc.FAF <= 10)) errs.FAF = "Expected 0..10.";
  if (!(enc.TUE >= 0 && enc.TUE <= 24)) errs.TUE = "Expected 0..24.";
  if (![0, 1, 2].includes(enc.CALC)) errs.CALC = "Expected 0..2.";
  if (!ALLOWED_MTRANS.has(enc.MTRANS)) errs.MTRANS = "Invalid transport.";
  return errs;
}

// POST /api/medical-report/retrieve
const predict = async (req, res) => {
  const user_input = req.body || {};

  try {
    // --- Build the AI payload directly from FE values (minimal transforms) ---
    const enc = {
      Gender: normalizeGender(user_input.Gender),
      Age: Number(user_input.Age),
      Height: Number(user_input.Height),
      Weight: Number(user_input.Weight),
      family_history_with_overweight: toYesNoStr(user_input.family_history_with_overweight),
      FAVC: to01Int(user_input.FAVC), // 3900 -> 1
      FCVC: Number(user_input.FCVC),
      NCP: Number(user_input.NCP),
      CAEC: normalizeEnum(user_input.CAEC, 3),
      SMOKE: to01Int(user_input.SMOKE),
      CH2O: Number(user_input.CH2O),
      SCC: toYesNoStr(user_input.SCC),
      FAF: Number(user_input.FAF),
      TUE: Number(user_input.TUE),
      CALC: normalizeEnum(user_input.CALC, 2),
      MTRANS: normalizeMTRANS(user_input.MTRANS),
    };

    // Validate & show helpful logs when failing
    // const errs = validateEncoded(enc);
    // if (Object.keys(errs).length) {
    //   console.error("[predict] Validation failed:", errs, "\nEncoded:", enc, "\nRaw:", user_input);
    //   return res.status(400).json({ error: "Invalid values", fields: errs, encoded: enc });
    // }

    // --- Call AI ---
    const ai_response = await fetch(AI_RETRIEVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enc),
    });

    const text = await ai_response.text();
    let result;
    try { result = JSON.parse(text); } catch { result = text; }

    if (!ai_response.ok) {
      return res.status(ai_response.status).json({
        error: "AI retrieve error",
        status: ai_response.status,
        detail: typeof result === "string" ? result : (result?.detail || result),
      });
    }

    if (!result || !result.medical_report) {
      return res.status(400).json({
        error: "AI server returned no medical_report",
        message: result,
      });
    }

    const medical_report = result.medical_report;

    // --- Persist to DB ---
    const userId = req.user?.id || user_input.user_id;
    if (!userId) {
      return res.status(400).json({ error: "Missing user_id for saving records" });
    }

    // Survey row (use FE calories for calorie_intake_per_day)
    const surveyRow = await insertSurvey({
      user_id: userId,
      gender: enc.Gender === 1 ? "male" : enc.Gender === 2 ? "female" : null,
      age: enc.Age,
      height_m: enc.Height,
      weight_kg: enc.Weight,
      family_history: enc.family_history_with_overweight === "yes",
      calorie_intake_per_day: Number(user_input.FAVC) || null, // <-- FE field
      vegetable_consumption: enc.FCVC,
      main_meals_per_day: enc.NCP,
    });

    // Risk report row
    const obesityLevel = medical_report?.obesity_prediction?.obesity_level ?? null;
    const obesityConf = Number(medical_report?.obesity_prediction?.confidence) || null;
    const diabetesBool = !!medical_report?.diabetes_prediction?.diabetes;
    const diabetesConf = Number(medical_report?.diabetes_prediction?.confidence) || null;

    await insertRiskReport({
      user_id: userId,
      bmi: Number(medical_report.bmi) || null,
      obesity_risk_label: obesityLevel,
      obesity_risk_score: obesityConf,
      diabetes_risk_label: diabetesBool ? "Positive" : "Negative",
      diabetes_risk_score: diabetesConf,
      nutribot_recommendation: medical_report.nutribot_recommendation || null,
      model_version: medical_report.model_version || "v1",
    });

    // --- Respond ---
    return res.status(200).json({
      survey_id: surveyRow.id,
      medical_report,
    });
  } catch (error) {
    console.error("[predict] Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { predict };
