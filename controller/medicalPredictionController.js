// controller/obesity.controller.js

// Node 18+ has global fetch; if you're on Node 16, uncomment this:
// const fetch = require("node-fetch");

const AI_RETRIEVE_URL =
  process.env.AI_RETRIEVE_URL ||
  "http://localhost:8000/ai-model/medical-report/retrieve";

const required_keys = [
  "Gender", "Age", "Height", "Weight",
  "family_history_with_overweight", "FAVC", "FCVC", "NCP",
  "CAEC", "SMOKE", "CH2O", "SCC", "FAF", "TUE", "CALC", "MTRANS"
];

// Map incoming verbose labels -> short feature names your AI expects
const LABEL_TO_FEATURE = {
  "Gender": "Gender",
  "Age": "Age",
  "Height": "Height",
  "Weight": "Weight",
  "Any family history of overweight (yes/no)": "family_history_with_overweight",
  "Frequent High Calorie Food Consumption (yes/no)": "FAVC",
  "Consumption of vegetables in meals": "FCVC",
  "Number of Main Meals": "NCP",
  "Consumption of Food Between Meals": "CAEC",
  "Do you Smoke?": "SMOKE",
  "Daily Water Intake": "CH2O",
  "Do you monitor your daily calories?": "SCC",
  "Physical Activity Frequency": "FAF",
  "Time Using Technology Devices Daily": "TUE",
  "Alcohol Consumption Rate": "CALC",
  "Mode of Transportation you use": "MTRANS"
};

// ---------- helpers ----------
const lower = v => typeof v === "string" ? v.trim().toLowerCase() : v;

function mapVerboseToShort(input) {
  const out = {};
  // keep already-short keys
  Object.keys(input).forEach(k => {
    if (required_keys.includes(k)) out[k] = input[k];
  });
  // map verbose -> short
  Object.keys(input).forEach(k => {
    const shortKey = LABEL_TO_FEATURE[k];
    if (shortKey && !(shortKey in out)) out[shortKey] = input[k];
  });
  return out;
}

function normalizeGenderToInt(v) {
  const s = lower(v);
  if (s === "male" || s === "m") return 1;     // per AI: 1 = Male
  if (s === "female" || s === "f") return 2;   // per AI: 2 = Female
  return undefined;
}

function yesNoStr(v) {
  const s = lower(v);
  if (["yes","y","true","1"].includes(s)) return "yes";
  if (["no","n","false","0"].includes(s)) return "no";
  return undefined;
}

function yesNoInt(v) {
  const s = lower(v);
  if (["yes","y","true","1"].includes(s)) return 1;
  if (["no","n","false","0"].includes(s)) return 0;
  return undefined;
}

// CAEC int: 0=Never, 1=Sometimes, 2=Frequently, 3=Always
function normalizeCAEC(v) {
  const s = lower(v);
  if (s === "no" || s === "never") return 0;
  if (s === "sometimes") return 1;
  if (s === "frequently") return 2;
  if (s === "always") return 3;
  const n = Number(v);
  if (Number.isInteger(n) && n >= 0 && n <= 3) return n;
  return undefined;
}

// CALC int: 0=Never/No, 1=Sometimes, 2=Frequently/Always
function normalizeCALC(v) {
  const s = lower(v);
  if (s === "no" || s === "never") return 0;
  if (s === "sometimes") return 1;
  if (s === "frequently" || s === "always") return 2;
  const n = Number(v);
  if (Number.isInteger(n) && n >= 0 && n <= 2) return n;
  return undefined;
}

const ALLOWED_MTRANS = new Set([
  "Walking", "Bike", "Public_Transportation", "Automobile", "Motorbike"
]);

function normalizeMTRANS(v) {
  if (v == null) return undefined;
  let s = String(v).trim();

  // common variants -> canonicals
  const l = s.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ");
  if (l === "walking" || l === "walk") return "Walking";
  if (l === "bike" || l === "bicycle") return "Bike";
  if (l === "public transportation" || l === "public_transportation" || l === "public" || l === "bus" || l === "train")
    return "Public_Transportation";
  if (l === "automobile" || l === "car") return "Automobile";
  if (l === "motorbike" || l === "motorcycle") return "Motorbike";

  // already exact?
  if (ALLOWED_MTRANS.has(s)) return s;
  return undefined;
}

function encodeForAI(mapped) {
  // Coerce numeric-ish fields
  const enc = {
    Age: Number(mapped.Age),
    Height: Number(mapped.Height),
    Weight: Number(mapped.Weight),
    FCVC: Number(mapped.FCVC),
    NCP: Number(mapped.NCP),
    CH2O: Number(mapped.CH2O),
    FAF: Number(mapped.FAF),
    TUE: Number(mapped.TUE)
  };

  enc.Gender = normalizeGenderToInt(mapped.Gender);

  // Strings 'yes'/'no'
  enc.family_history_with_overweight = yesNoStr(mapped.family_history_with_overweight);
  enc.SCC = yesNoStr(mapped.SCC);

  // Int yes/no
  enc.FAVC = yesNoInt(mapped.FAVC);
  enc.SMOKE = yesNoInt(mapped.SMOKE);

  // Int enums
  enc.CAEC = normalizeCAEC(mapped.CAEC);
  enc.CALC = normalizeCALC(mapped.CALC);

  // Literal transport
  enc.MTRANS = normalizeMTRANS(mapped.MTRANS);

  return enc;
}

function validateEncoded(enc) {
  const errs = {};

  // Presence / type sanity (mirrors AI pydantic schema)
  if (![1,2].includes(enc.Gender)) errs.Gender = "Expected 1 (Male) or 2 (Female).";
  if (!(enc.Age > 0 && enc.Age < 120)) errs.Age = "Age must be 0-120 (non-inclusive).";
  if (!(enc.Height > 0.5 && enc.Height < 2.5)) errs.Height = "Height must be 0.5-2.5 meters.";
  if (!(enc.Weight > 10 && enc.Weight < 300)) errs.Weight = "Weight must be 10-300 kg.";
  if (!["yes","no"].includes(enc.family_history_with_overweight)) errs.family_history_with_overweight = "Expected 'yes' or 'no'.";
  if (![0,1].includes(enc.FAVC)) errs.FAVC = "Expected 0/1 (no/yes).";
  if (!(enc.FCVC >= 0 && enc.FCVC <= 5)) errs.FCVC = "Expected 0..5.";
  if (!(enc.NCP >= 0 && enc.NCP <= 10)) errs.NCP = "Expected 0..10.";
  if (![0,1,2,3].includes(enc.CAEC)) errs.CAEC = "Expected 0..3 (Never/Sometimes/Frequently/Always).";
  if (![0,1].includes(enc.SMOKE)) errs.SMOKE = "Expected 0/1 (no/yes).";
  if (!(enc.CH2O >= 0 && enc.CH2O <= 10)) errs.CH2O = "Expected 0..10.";
  if (!["yes","no"].includes(enc.SCC)) errs.SCC = "Expected 'yes' or 'no'.";
  if (!(enc.FAF >= 0 && enc.FAF <= 10)) errs.FAF = "Expected 0..10.";
  if (!(enc.TUE >= 0 && enc.TUE <= 24)) errs.TUE = "Expected 0..24.";
  if (![0,1,2].includes(enc.CALC)) errs.CALC = "Expected 0..2 (Never/Some/Frequent).";
  if (!ALLOWED_MTRANS.has(enc.MTRANS)) errs.MTRANS = `Expected one of ${Array.from(ALLOWED_MTRANS).join(", ")}`;

  return errs;
}

// Used by [POST] /api/obesity/predict
const predict = async (req, res) => {
  const user_input = req.body || {};

  try {
    // 1) Map verbose -> short keys FIRST
    const mapped = mapVerboseToShort(user_input);

    // 2) Validate presence against required keys (on mapped object)
    const missing = required_keys.filter(k => !(k in mapped));
    if (missing.length > 0) {
      return res.status(400).json({
        error: "Missing keys in request, cannot provide prediction.",
        missing
      });
    }

    // 3) Encode to AI schema (types and enums)
    const encoded = encodeForAI(mapped);

    // 4) Pre-flight validation (clear 400s instead of 422 from AI)
    const errs = validateEncoded(encoded);
    if (Object.keys(errs).length) {
      return res.status(400).json({ error: "Invalid values", fields: errs, received: mapped });
    }

    // 5) Call AI to retrieve medical_report with encoded payload
    const ai_response = await fetch(AI_RETRIEVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(encoded)
    });

    const text = await ai_response.text();
    let result;
    try { result = JSON.parse(text); } catch { result = text; }

    if (!ai_response.ok) {
      return res.status(502).json({
        error: "AI retrieve error",
        status: ai_response.status,
        detail: typeof result === "string" ? result : (result?.detail || result)
      });
    }

    if (!result || !result.medical_report) {
      return res.status(400).json({
        error: "An error occurred when fetching result from AI server: medical_report field not found",
        message: result
      });
    }

    return res.status(200).json({
      medical_report: result.medical_report
    });

  } catch (error) {
    console.error("[predict] Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { predict };
