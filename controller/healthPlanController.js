// controllers/healthPlanController.js
const Groq = require('groq-sdk');

// [TEMP-DB-OFF] keep import for easy revert; safe to leave unused
const supabase = require("../dbConnection.js");

const HEALTH_PLAN_PROMPT = `You are a certified fitness coach and clinical dietitian.
Generate a personalised 4-week health and wellness plan based on the user's medical data and goals.
Respond with ONLY valid JSON — no markdown, no backticks, no explanation.

Return exactly this JSON shape:
{
  "weekly_plan": [
    {
      "week": 1,
      "target_calories_per_day": 1800,
      "focus": "Building baseline activity",
      "workouts": ["20 min walk", "10 min stretching", "Light bodyweight squats x10"],
      "meal_notes": "Prioritise lean protein and vegetables; avoid processed foods.",
      "reminders": ["Drink 8 glasses of water", "Sleep 7–8 hours"]
    }
  ],
  "suggestion": "One paragraph of personalised advice based on the medical profile.",
  "progress_analysis": "Brief note on expected progress over 4 weeks."
}`;

function buildHealthPlanPrompt(medicalReport, healthGoal, healthSurvey) {
  const report = Array.isArray(medicalReport) ? medicalReport[0] : medicalReport;
  const obesity = report?.obesity_prediction?.obesity_level || "Unknown";
  const diabetes = report?.diabetes_prediction?.diabetes ? "Yes" : "No";
  const info = report?.health_info || healthSurvey || {};

  return `User profile:
- Gender: ${info.gender || "Not specified"}
- Age: ${info.age || "Not specified"}
- Height: ${info.height ? `${info.height}m` : "Not specified"}
- Weight: ${info.weight ? `${info.weight}kg` : "Not specified"}
- Obesity level: ${obesity}
- Diabetes: ${diabetes}
- Workout days per week: ${healthGoal.days_per_week}
- Preferred workout place: ${healthGoal.workout_place || "any"}
- Target weight: ${healthGoal.target_weight ? `${healthGoal.target_weight}kg` : "Not specified"}

Generate a 4-week health plan for this person.`;
}

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

// --------- DB helpers ---------
// [TEMP-DB-OFF] Commented out to avoid writes while user_id is unavailable.
// async function insertHealthPlan(plan) {
//   const { data, error } = await supabase
//     .from("health_plan")
//     .insert(plan)
//     .select("id")
//     .single();
//   if (error) throw error;
//   return data;
// }

// async function insertWeeklyPlans(weeklyPlans) {
//   const { error } = await supabase.from("health_plan_weekly").insert(weeklyPlans);
//   if (error) throw error;
// }

// async function deleteHealthPlan(planId) {
//   const { error } = await supabase.from("health_plan").delete().eq("id", planId);
//   if (error) throw error;
// }

function derivePlanGoal(weekly) {
  if (!Array.isArray(weekly) || weekly.length === 0) return null;
  const all = weekly.map((w) => (w?.focus || "").trim()).filter(Boolean);
  if (all.length === 0) return null;
  const first = all[0];
  const allSame = all.every((x) => x === first);
  return allSame ? first : "Mixed";
}

/**
 * Body:
 * {
 *   medical_report: { ... } | [{ ... }],
 *   survey_data: { ... },
 *   user_id: string,        // <-- FE not sending for now
 *   survey_id: string
 * }
 */
const generateWeeklyPlan = async (req, res) => {
  const body = req.body || {};

  try {
    if (!body.medical_report) {
      return res.status(400).json({ error: "Missing medical_report in request" });
    }
    if (!body.survey_data) {
      return res.status(400).json({ error: "Missing survey_data in request" });
    }

    // health goal
    const hgCheck = buildHealthGoalFromSurvey(body.survey_data);
    if (hgCheck.error) {
      return res.status(400).json({ error: hgCheck.error });
    }
    const health_goal = hgCheck.value;

    // survey (optional for AI payload)
    const health_survey = buildHealthSurvey(body.survey_data);

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service not configured" });
    }

    const userMessage = buildHealthPlanPrompt(body.medical_report, health_goal, health_survey);
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 30000 });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: HEALTH_PLAN_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 2000,
    });

    const rawText = completion.choices[0]?.message?.content || "";
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    let result;
    try {
      result = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    } catch {
      console.error("[healthPlanController] JSON parse failed:", rawText.slice(0, 300));
      return res.status(502).json({ error: "AI returned invalid response, please try again" });
    }

    if (!result.weekly_plan) {
      return res.status(502).json({ error: "AI did not return weekly_plan" });
    }

    // ---------------------- [TEMP-DB-OFF] begin ----------------------
    // The following block (user_id check + DB inserts + rollback) is disabled
    // while FE does not send user_id. Keep logic here for easy revert.

    // const userId = req.user?.id || body.user_id;
    // const surveyId = body.survey_id || null;
    // if (!userId) {
    //   return res.status(400).json({ error: "Missing user_id for saving health plan" });
    // }
    // const weekly = result.weekly_plan;
    // const parent = {
    //   user_id: userId,
    //   survey_id: surveyId,
    //   length: weekly.length,
    //   goal: derivePlanGoal(weekly),
    //   suggestion: result.suggestion || null,
    // };
    // const parentRow = await insertHealthPlan(parent);
    // const planId = parentRow.id;
    // try {
    //   const weeklyRows = weekly.map((w) => ({
    //     health_plan_id: planId,
    //     week_num: Number(w.week),
    //     target_calorie_per_day: Number(w.target_calories_per_day),
    //     focus: w.focus ?? null,
    //     workouts: JSON.stringify(w.workouts ?? []),
    //     notes: w.meal_notes ?? null,
    //     reminders: JSON.stringify(w.reminders ?? []),
    //   }));
    //   await insertWeeklyPlans(weeklyRows);
    // } catch (e) {
    //   await deleteHealthPlan(planId); // rollback
    //   throw e;
    // }
    // ---------------------- [TEMP-DB-OFF] end ----------------------

    // Return AI result only (no DB persistence while TEMP-DB-OFF is active)
    return res.status(200).json({
      plan_id: null, // [TEMP-DB-OFF] no DB id
      suggestion: result.suggestion || "",
      weekly_plan: result.weekly_plan,
      progress_analysis: result.progress_analysis ?? null,
      // optional: echo derived goal/length for FE convenience
      goal: derivePlanGoal(result.weekly_plan) ?? null,
      length: Array.isArray(result.weekly_plan) ? result.weekly_plan.length : null,
    });
  } catch (err) {
    console.error("[healthPlanController] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { generateWeeklyPlan };
