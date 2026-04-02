const { expect } = require("chai");
const { validationResult } = require("express-validator");
const {
  validateWearablePayload,
  validateWearableQuery,
} = require("../validators/wearableDataValidator");

async function runValidation(validators, req) {
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req).array();
}

describe("wearableDataValidator", () => {
  it("accepts a valid wearable ingestion payload", async () => {
    const req = {
      body: {
        source: "fitbit",
        recorded_at: "2026-04-02T08:30:00.000Z",
        metrics: {
          steps: { value: 8765, unit: "steps" },
          heart_rate: { value: 72, unit: "bpm" },
        },
      },
    };

    const errors = await runValidation(validateWearablePayload, req);
    expect(errors).to.have.length(0);
  });

  it("rejects malformed wearable payloads", async () => {
    const req = {
      body: {
        source: "fitbit",
        recorded_at: "invalid-date",
        metrics: {},
      },
    };

    const errors = await runValidation(validateWearablePayload, req);
    expect(errors.length).to.be.greaterThan(0);
  });

  it("rejects invalid latest query limit", async () => {
    const req = {
      query: {
        limit: "500",
      },
    };

    const errors = await runValidation(validateWearableQuery, req);
    expect(errors.length).to.equal(1);
    expect(errors[0].msg).to.equal("limit must be an integer between 1 and 100");
  });
});
