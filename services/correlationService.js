const supabase = require("../dbConnection");

async function processEvent(event) {
  if (!event) return;

  switch (event.event_type) {
    case "LOGIN_FAILED":
      await detectBruteForce(event);
      break;
    case "LOGIN_SUCCESS":
      await detectSuspiciousLoginSuccess(event);
      break;
    default:
      break;
  }
}

async function detectBruteForce(event) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  let query = supabase
    .from("security_events")
    .select("*")
    .eq("event_type", "LOGIN_FAILED")
    .gte("event_time", tenMinutesAgo);

  if (event.user_id) {
    query = query.eq("user_id", event.user_id);
  } else {
    query = query.eq("ip_address", event.ip_address);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Brute force query failed:", error.message);
    return;
  }

  if (data && data.length >= 5) {
    await supabase.from("security_alerts").insert([{
      pattern_type: "BRUTE_FORCE_SUSPECTED",
      severity: "high",
      user_id: event.user_id || null,
      first_seen: data[data.length - 1].event_time,
      last_seen: data[0].event_time,
      confidence: 85,
      recommended_action: "temporary_account_lock",
      metadata: {
        matched_event_count: data.length,
        ip_address: event.ip_address || null
      }
    }]);
  }
}

async function detectSuspiciousLoginSuccess(event) {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  let query = supabase
    .from("security_events")
    .select("*")
    .eq("event_type", "LOGIN_FAILED")
    .gte("event_time", fifteenMinutesAgo);

  if (event.user_id) {
    query = query.eq("user_id", event.user_id);
  } else {
    query = query.eq("ip_address", event.ip_address);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Suspicious login query failed:", error.message);
    return;
  }

  if (data && data.length >= 3) {
    await supabase.from("security_alerts").insert([{
      pattern_type: "ACCOUNT_TAKEOVER_RISK",
      severity: "high",
      user_id: event.user_id || null,
      first_seen: data[data.length - 1].event_time,
      last_seen: event.event_time,
      confidence: 80,
      recommended_action: "force_password_reset_or_session_review",
      metadata: {
        preceding_failed_logins: data.length,
        ip_address: event.ip_address || null
      }
    }]);
  }
}

module.exports = { processEvent };