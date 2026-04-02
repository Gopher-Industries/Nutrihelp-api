const supabase = require("../../dbConnection");

async function insertWearableData(records) {
  const { data, error } = await supabase
    .from("wearable_device_data")
    .insert(records)
    .select();

  if (error) {
    throw error;
  }

  return data || [];
}

async function getLatestWearableDataByUserId(userId, limit = 50) {
  const { data, error } = await supabase
    .from("wearable_device_data")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

module.exports = {
  getLatestWearableDataByUserId,
  insertWearableData,
};
