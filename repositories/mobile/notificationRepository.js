const supabase = require("../../dbConnection");

async function getNotificationsByUserId(userId, { limit, status } = {}) {
  let query = supabase
    .from("notifications")
    .select("simple_id, type, content, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data || [];
}

async function getUnreadNotificationCountByUserId(userId) {
  const { count, error } = await supabase
    .from("notifications")
    .select("simple_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "unread");

  if (error) {
    throw error;
  }

  return count || 0;
}

module.exports = {
  getNotificationsByUserId,
  getUnreadNotificationCountByUserId,
};
