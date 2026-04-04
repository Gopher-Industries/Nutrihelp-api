const supabase = require("../dbConnection");
const correlationService = require("./correlationService");

async function logSecurityEvent(event) {
  const payload = {
    event_type: event.event_type,
    severity: event.severity || "low",
    user_id: event.user_id || null,
    session_id: event.session_id || null,
    ip_address: event.ip_address || null,
    user_agent: event.user_agent || null,
    resource: event.resource || null,
    event_time: new Date().toISOString(),
    metadata: event.metadata || {}
  };

  console.log("INSERTING SECURITY EVENT:", payload);

  const { data, error } = await supabase
    .from("security_events")
    .insert([payload])
    .select()
    .single();

  console.log("INSERT RESULT:", data, error);

  if (error) {
    console.error("❌ FULL ERROR:", error);
    return null;
  }

  await correlationService.processEvent(data);
  return data;
}

module.exports = { logSecurityEvent };