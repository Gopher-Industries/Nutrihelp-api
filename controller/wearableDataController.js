const wearableDataService = require("../services/wearableDataService");

async function ingestWearableData(req, res) {
  try {
    const result = await wearableDataService.ingestWearableData(req.user.userId, req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: status >= 500 ? "Failed to ingest wearable data" : error.message,
      details: error.details || undefined,
    });
  }
}

async function getLatestWearableSummary(req, res) {
  try {
    const limit = Number.isInteger(Number(req.query.limit))
      ? Math.min(Math.max(parseInt(req.query.limit, 10), 1), 100)
      : 50;

    const result = await wearableDataService.getLatestWearableSummary(req.user.userId, limit);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: status >= 500 ? "Failed to load wearable data" : error.message,
      details: error.details || undefined,
    });
  }
}

module.exports = {
  getLatestWearableSummary,
  ingestWearableData,
};
