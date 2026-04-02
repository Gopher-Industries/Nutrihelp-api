const express = require("express");
const wearableDataController = require("../controller/wearableDataController");
const { authenticateToken } = require("../middleware/authenticateToken");
const validateRequest = require("../middleware/validateRequest");
const {
  validateWearablePayload,
  validateWearableQuery,
} = require("../validators/wearableDataValidator");

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  validateWearablePayload,
  validateRequest,
  wearableDataController.ingestWearableData,
);

router.get(
  "/latest",
  authenticateToken,
  validateWearableQuery,
  validateRequest,
  wearableDataController.getLatestWearableSummary,
);

module.exports = router;
