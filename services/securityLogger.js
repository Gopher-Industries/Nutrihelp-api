function createLog({
  event_type,
  severity_level = "LOW",
  user_id = null,
  source_service = "backend",
  ip_address = null,
  endpoint = null,
  method = null,
  status = "SUCCESS",
  message = "",
  metadata = {}
}) {
  return {
    timestamp: new Date().toISOString(),
    event_type,
    severity_level,
    user_id,
    source_service,
    ip_address,
    endpoint,
    method,
    status,
    message,
    metadata
  };
}

function log(entry) {
  console.log(JSON.stringify(entry, null, 2));
}

module.exports = { createLog, log };