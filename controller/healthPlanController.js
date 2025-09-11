// controller/healthPlanController.js
const generateWeeklyPlan = async (req, res) => {
  const body = req.body || {};
  const AI_BASE = process.env.AI_BASE_URL || "http://localhost:8000/ai-model/medical-report";

  try {
    if (!body.medical_report) {
      return res.status(400).json({ error: "Missing medical_report in request" });
    }

    // Build payload exactly like FastAPI expects
    const payload = {
      medical_report: body.medical_report,
      n_results: body.n_results || 4,
      max_tokens: body.max_tokens || 1200,
      temperature: body.temperature || 0.2
    };

    const aiResponse = await fetch(`${AI_BASE}/plan/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await aiResponse.json();

    if (!aiResponse.ok) {
      return res.status(aiResponse.status).json({
        error: "AI server error",
        detail: result?.detail || result
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
      weekly_plan: result.weekly_plan
    });
  } catch (err) {
    console.error("[healthPlanController] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  generateWeeklyPlan
};
