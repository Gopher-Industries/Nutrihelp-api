const { expect } = require("chai");
const proxyquire = require("proxyquire");

describe("wearableDataService", () => {
  it("normalizes supported metrics before persisting", async () => {
    const insertWearableData = async (records) => records;

    const service = proxyquire("../services/wearableDataService", {
      "../repositories/wearable-device/wearableDataRepository": {
        insertWearableData,
        getLatestWearableDataByUserId: async () => [],
      },
    });

    const result = await service.ingestWearableData(42, {
      source: "apple_health",
      recorded_at: "2026-04-02T08:30:00.000Z",
      timezone: "Australia/Melbourne",
      device: { id: "watch-1", name: "Apple Watch" },
      metrics: {
        steps: { value: 4567.4, unit: "steps" },
        sleep_duration: { value: 7.5, unit: "hours" },
        calories_burned: { value: 450, unit: "kcal" },
      },
    });

    expect(result.success).to.equal(true);
    expect(result.metricsStored).to.equal(3);
    expect(result.records[0].metric_type).to.equal("steps");
    expect(result.records[0].metric_value).to.equal(4567);
    expect(result.records[1].metric_type).to.equal("sleep_duration");
    expect(result.records[1].metric_unit).to.equal("minutes");
    expect(result.records[1].metric_value).to.equal(450);
  });

  it("converts calories from cal to kcal", async () => {
    const service = proxyquire("../services/wearableDataService", {
      "../repositories/wearable-device/wearableDataRepository": {
        insertWearableData: async (records) => records,
        getLatestWearableDataByUserId: async () => [],
      },
    });

    const result = await service.ingestWearableData(7, {
      source: "fitbit",
      recorded_at: "2026-04-02T08:30:00.000Z",
      metrics: {
        calories_burned: { value: 120000, unit: "cal" },
      },
    });

    expect(result.records[0].metric_value).to.equal(120);
    expect(result.records[0].metric_unit).to.equal("kcal");
  });

  it("rejects unsupported units with a client error", async () => {
    const service = proxyquire("../services/wearableDataService", {
      "../repositories/wearable-device/wearableDataRepository": {
        insertWearableData: async (records) => records,
        getLatestWearableDataByUserId: async () => [],
      },
    });

    let caughtError = null;
    try {
      await service.ingestWearableData(42, {
        source: "google_fit",
        recorded_at: "2026-04-02T08:30:00.000Z",
        metrics: {
          heart_rate: { value: 70, unit: "beats" },
        },
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).to.be.an("error");
    expect(caughtError.statusCode).to.equal(400);
    expect(caughtError.message).to.equal("heart_rate unit must be bpm");
  });

  it("builds latest metric summary from stored records", async () => {
    const service = proxyquire("../services/wearableDataService", {
      "../repositories/wearable-device/wearableDataRepository": {
        insertWearableData: async (records) => records,
        getLatestWearableDataByUserId: async () => ([
          {
            metric_type: "heart_rate",
            metric_value: 66,
            metric_unit: "bpm",
            recorded_at: "2026-04-02T08:30:00.000Z",
            source: "fitbit",
            device_id: "fitbit-1",
            device_name: "Fitbit Sense",
          },
          {
            metric_type: "steps",
            metric_value: 10234,
            metric_unit: "count",
            recorded_at: "2026-04-02T08:00:00.000Z",
            source: "fitbit",
            device_id: "fitbit-1",
            device_name: "Fitbit Sense",
          },
        ]),
      },
    });

    const result = await service.getLatestWearableSummary(42, 10);

    expect(result.success).to.equal(true);
    expect(result.count).to.equal(2);
    expect(result.latestMetrics.heart_rate.value).to.equal(66);
    expect(result.latestMetrics.steps.unit).to.equal("count");
  });
});
