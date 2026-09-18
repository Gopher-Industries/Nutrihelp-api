const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();

/**
 * CS-VULN-016 regression tests.
 *
 * The existing suite (securityAlertsA3A8A9A10.test.js) covers detection only:
 * evaluateA1 through evaluateA12 and a checkAlerts integration case. Nothing
 * exercised dispatch, which is why nodemailer.createTransporter survived.
 *
 * These tests cover the dispatch path instead:
 *   1. a successful send is reported as a success
 *   2. a failed send is reported as a failure, not counted as sent
 *   3. the service calls createTransport, not createTransporter
 *
 * supabaseClient is stubbed to null so persistAlertHistory returns immediately
 * and no test can reach the database.
 */

function loadService({ sendMail }) {
  return proxyquire("../services/securityAlertService", {
    nodemailer: {
      createTransport: () => ({ sendMail }),
    },
    "./supabaseClient": {
      getSupabaseServiceClient: () => null,
      supabaseAnon: null,
      supabaseService: null,
    },
  });
}

const alert = {
  alert_id: "TEST-DISPATCH-001",
  severity: "HIGH",
  trigger_summary: "dispatch path regression test",
  notification_channels: ["email"],
  triage_sla_minutes: 30,
  response_actions: ["No action, test alert"],
  payload: { test: true },
};

describe("securityAlertService dispatch path (CS-VULN-016)", () => {
  const envKeys = ["ALERT_EMAIL_FROM", "ALERT_EMAIL_PASSWORD", "ALERT_EMAIL_TO"];
  const saved = {};

  beforeEach(() => {
    envKeys.forEach((k) => { saved[k] = process.env[k]; });
    process.env.ALERT_EMAIL_FROM = "alerts@test.local";
    process.env.ALERT_EMAIL_PASSWORD = "not-a-real-password";
    process.env.ALERT_EMAIL_TO = "soc@test.local";
  });

  afterEach(() => {
    envKeys.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it("reports a successful email dispatch as a success", async () => {
    let delivered = null;
    const svc = loadService({
      sendMail: async (payload) => {
        delivered = payload;
        return { messageId: "<test@local>" };
      },
    });

    const result = await svc.sendAlert(alert);

    expect(result.channels.email.success).to.equal(true);
    expect(result.overall_success).to.equal(true);
    expect(delivered).to.not.equal(null);
    expect(delivered.to).to.deep.equal(["soc@test.local"]);
    expect(delivered.subject).to.contain("TEST-DISPATCH-001");
  });

  it("reports a failed email dispatch as a failure, not as sent", async () => {
    const svc = loadService({
      sendMail: async () => { throw new Error("SMTP refused the connection"); },
    });

    const result = await svc.sendAlert(alert);

    expect(result.channels.email.success).to.equal(false);
    expect(result.channels.email.error).to.contain("SMTP refused");
    expect(result.overall_success).to.equal(false);
  });

  it("calls nodemailer.createTransport, not createTransporter", async () => {
    // noCallThru means the stub below is the entire nodemailer module.
    // If the service reverts to createTransporter it will be undefined and
    // the send will fail, so this test fails rather than silently passing.
    let usedCorrectFactory = false;
    const svc = proxyquire("../services/securityAlertService", {
      nodemailer: {
        createTransport: () => {
          usedCorrectFactory = true;
          return { sendMail: async () => ({ messageId: "<test@local>" }) };
        },
      },
      "./supabaseClient": {
        getSupabaseServiceClient: () => null,
        supabaseAnon: null,
        supabaseService: null,
      },
    });

    const result = await svc.sendAlert(alert);

    expect(usedCorrectFactory).to.equal(true);
    expect(result.overall_success).to.equal(true);
  });
});
