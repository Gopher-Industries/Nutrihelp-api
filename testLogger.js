const { createLog, log } = require("./services/securityLogger");

const testEntry = createLog({
  event_type: "TEST_EVENT",
  severity_level: "LOW",
  user_id: "12345",
  source_service: "test-script",
  ip_address: "127.0.0.1",
  endpoint: "/test",
  method: "GET",
  status: "SUCCESS",
  message: "Testing unified logging schema",
  metadata: {
    sample: true
  }
});

log(testEntry);