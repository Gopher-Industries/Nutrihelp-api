// models/healthRiskReportModel.js
const supabase = require("../dbConnection.js");

async function insertRiskReport(report) {
  const { data, error } = await supabase
    .from("health_risk_reports")
    .insert(report)
    .select("id")
    .single();

  if (error) throw error;
  return data; // { id: ... }
}

module.exports = { insertRiskReport };
