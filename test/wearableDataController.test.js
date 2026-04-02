const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("wearableDataController", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("returns 201 for successful ingestion", async () => {
    const ingestWearableData = sinon.stub().resolves({
      success: true,
      metricsStored: 2,
    });

    const controller = proxyquire("../controller/wearableDataController", {
      "../services/wearableDataService": {
        ingestWearableData,
        getLatestWearableSummary: sinon.stub(),
      },
    });

    const req = {
      user: { userId: 42 },
      body: { source: "fitbit" },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.ingestWearableData(req, res);

    expect(ingestWearableData.calledOnceWith(42, req.body)).to.equal(true);
    expect(res.status.calledWith(201)).to.equal(true);
  });

  it("returns 400 for client validation errors from the service", async () => {
    const error = new Error("Unsupported wearable source");
    error.statusCode = 400;

    const controller = proxyquire("../controller/wearableDataController", {
      "../services/wearableDataService": {
        ingestWearableData: sinon.stub().rejects(error),
        getLatestWearableSummary: sinon.stub(),
      },
    });

    const req = {
      user: { userId: 42 },
      body: {},
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.ingestWearableData(req, res);

    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.firstCall.args[0].error).to.equal("Unsupported wearable source");
  });

  it("returns latest wearable summary", async () => {
    const getLatestWearableSummary = sinon.stub().resolves({
      success: true,
      count: 1,
      latestMetrics: { steps: { value: 5000, unit: "count" } },
      records: [],
    });

    const controller = proxyquire("../controller/wearableDataController", {
      "../services/wearableDataService": {
        ingestWearableData: sinon.stub(),
        getLatestWearableSummary,
      },
    });

    const req = {
      user: { userId: 7 },
      query: { limit: "10" },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await controller.getLatestWearableSummary(req, res);

    expect(getLatestWearableSummary.calledOnceWith(7, 10)).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
  });
});
