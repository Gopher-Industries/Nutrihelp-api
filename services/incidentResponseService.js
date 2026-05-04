const supabase = require("../dbConnection");

async function handleAlert(alert) {
  if (!alert) return;

  switch (alert.pattern_type) {
    case "BRUTE_FORCE_SUSPECTED":
      await handleBruteForce(alert);
      break;

    case "ACCOUNT_TAKEOVER_RISK":
      await handleAccountTakeover(alert);
      break;

    default:
      break;
  }
}

// 🔴 Response for brute force
async function handleBruteForce(alert) {
  if (!alert.user_id) return;

  // Example: temporary account lock
  await supabase
    .from("users")
    .update({ account_status: "locked" })
    .eq("user_id", alert.user_id);

  // Log response
  await logResponse(alert, "ACCOUNT_LOCKED");
}

// 🔴 Response for account takeover
async function handleAccountTakeover(alert) {
  if (!alert.user_id) return;

  await supabase
    .from("users")
    .update({ force_password_reset: true })
    .eq("user_id", alert.user_id);

  await logResponse(alert, "PASSWORD_RESET_REQUIRED");
}

// 🧾 Log response actions
async function logResponse(alert, action) {
  await supabase.from("security_responses").insert([{
    alert_id: alert.id,
    response_type: action,
    executed_at: new Date().toISOString(),
    metadata: {
      user_id: alert.user_id
    }
  }]);
}

module.exports = { handleAlert };