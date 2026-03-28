// models/healthSurveyModel.js
const supabase = require("../dbConnection.js");

async function insertSurvey(survey) {
  const { data, error } = await supabase
    .from("health_surveys")
    .insert(survey)
    .select("id")
    .single();

  if (error) throw error;
  return data; // { id: ... }
}

module.exports = { insertSurvey };
