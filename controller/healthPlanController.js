// controller/healthPlanController.js

// Node 18+ has global fetch; if you're on Node 16, uncomment:
// const fetch = require("node-fetch");

const AI_BASE =
  process.env.AI_BASE_URL || "http://localhost:8000/ai-model/medical-report";

// ---------- helpers ----------
const toNum = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
};

const normGender = (v) => {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["m", "male"].includes(s)) return "male";
  if (["f", "female"].includes(s)) return "female";
  if (["prefer_not_to_say", "prefer not to say", "na", "n/a"].includes(s)) {
    return "prefer_not_to_say";
  }
  return "other";
};

function pick(src, keys) {
  if (!src) return undefined;
  for (const k of keys) {
    if (src[k] !== undefined && src[k] !== null && src[k] !== "") return src[k];
  }
  return undefined;
}

/** Build the minimal survey (AI HealthSurvey): { gender, age, height, weight } */
function buildHealthSurvey(survey) {
  const gender = normGender(pick(survey, ["Gender", "gender"]));
  const age = toNum(pick(survey, ["Age", "age"]));
  const height = toNum(pick(survey, ["Height", "height"]));
  const weight = toNum(pick(survey, ["Weight", "weight"]));

  const out = {};
  if (gender != null) out.gender = gender;
  if (age != null) out.age = age;
  if (height != null) out.height = height;
  if (weight != null) out.weight = weight;

  return Object.keys(out).length ? out : undefined;
}

/** Extract & validate health_goal from survey_data (days_per_week required) */
function buildHealthGoalFromSurvey(survey) {
  const dpwRaw = pick(survey, ["days_per_week", "daysPerWeek", "DaysPerWeek"]);
  const dpw = Number(dpwRaw);
  if (!Number.isInteger(dpw) || dpw < 0 || dpw > 7) {
    return { error: "survey_data.days_per_week must be an integer 0–7" };
  }

  const out = { days_per_week: dpw };

  const twRaw = pick(survey, ["target_weight", "targetWeight", "TargetWeight"]);
  if (twRaw !== undefined) {
    const tw = Number(twRaw);
    if (!(tw > 0)) return { error: "survey_data.target_weight must be > 0 if provided" };
    out.target_weight = tw;
  }

  const wpRaw = pick(survey, ["workout_place", "workoutPlace", "WorkoutPlace"]);
  if (wpRaw !== undefined) {
    const wp = String(wpRaw).trim().toLowerCase();
    if (!["home", "gym"].includes(wp)) {
      return { error: "survey_data.workout_place must be 'home' or 'gym' if provided" };
    }
    out.workout_place = wp;
  }

  return { value: out };
}

/**
 * Body:
 * {
 *   medical_report: { ... } | [{ ... }],   // REQUIRED
 *   survey_data: { ... }                   // REQUIRED (contains both survey + health goal)
 * }
 */
const generateWeeklyPlan = async (req, res) => {
  const body = req.body || {};

  try {
    // 1) Required fields
    if (!body.medical_report) {
      return res.status(400).json({ error: "Missing medical_report in request" });
    }
    if (!body.survey_data) {
      return res.status(400).json({ error: "Missing survey_data in request" });
    }

    // 2) Build health_goal from survey_data
    const hgCheck = buildHealthGoalFromSurvey(body.survey_data);
    if (hgCheck.error) {
      return res.status(400).json({ error: hgCheck.error });
    }
    const health_goal = hgCheck.value;

    // 3) Build minimal HealthSurvey
    const health_survey = buildHealthSurvey(body.survey_data);

    // 4) Payload for AI (survey_data maps to health_survey via alias)
    const payload = {
      medical_report: Array.isArray(body.medical_report)
        ? body.medical_report
        : [body.medical_report],
      survey_data: health_survey || undefined, // alias to health_survey in AI
      health_goal,                             // REQUIRED
      followup_qa: null
    };

    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    // 5) Call AI
    const aiResponse = await fetch(`${AI_BASE}/plan/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await aiResponse.text();
    let result;
    try { result = JSON.parse(text); } catch { result = text; }

    if (!aiResponse.ok) {
      return res.status(aiResponse.status).json({
        error: "AI server error",
        detail: typeof result === "string" ? result : (result?.detail || result)
      });
    }

    if (!result.weekly_plan) {
      return res.status(502).json({
        error: "AI server did not return weekly_plan",
        message: result
      });
    }

    return res.status(200).json({
      suggestion: result.suggestion || "",
      weekly_plan: result.weekly_plan,
      progress_analysis: result.progress_analysis ?? null
    });
  } catch (err) {
    console.error("[healthPlanController] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { generateWeeklyPlan };
