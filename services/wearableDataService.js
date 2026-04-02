const wearableDataRepository = require("../repositories/wearable-device/wearableDataRepository");

const SUPPORTED_METRICS = ["steps", "heart_rate", "sleep_duration", "calories_burned"];
const SUPPORTED_SOURCES = ["apple_health", "google_fit", "fitbit", "garmin", "samsung_health", "manual", "other"];

function createClientError(message, details) {
  const error = new Error(message);
  error.statusCode = 400;
  if (details) {
    error.details = details;
  }
  return error;
}

function roundNumber(value, digits = 2) {
  return Number(Number(value).toFixed(digits));
}

function normalizeSource(source) {
  const normalized = String(source || "").trim().toLowerCase();
  if (!SUPPORTED_SOURCES.includes(normalized)) {
    throw createClientError("Unsupported wearable source", {
      supportedSources: SUPPORTED_SOURCES,
    });
  }
  return normalized;
}

function normalizeMetricValue(metricType, metricPayload) {
  const rawValue = Number(metricPayload.value);
  const rawUnit = String(metricPayload.unit || "").trim().toLowerCase();

  if (!Number.isFinite(rawValue)) {
    throw createClientError(`Invalid value for ${metricType}`);
  }

  switch (metricType) {
    case "steps": {
      if (!["count", "step", "steps"].includes(rawUnit)) {
        throw createClientError("steps unit must be count, step, or steps");
      }
      if (rawValue < 0) {
        throw createClientError("steps value must be zero or greater");
      }
      return {
        metricType,
        normalizedValue: Math.round(rawValue),
        normalizedUnit: "count",
      };
    }
    case "heart_rate": {
      if (rawUnit !== "bpm") {
        throw createClientError("heart_rate unit must be bpm");
      }
      if (rawValue <= 0 || rawValue > 300) {
        throw createClientError("heart_rate value must be between 1 and 300 bpm");
      }
      return {
        metricType,
        normalizedValue: roundNumber(rawValue),
        normalizedUnit: "bpm",
      };
    }
    case "sleep_duration": {
      if (rawValue < 0) {
        throw createClientError("sleep_duration value must be zero or greater");
      }

      let normalizedValue;
      if (["minute", "minutes", "min", "mins"].includes(rawUnit)) {
        normalizedValue = rawValue;
      } else if (["hour", "hours", "hr", "hrs"].includes(rawUnit)) {
        normalizedValue = rawValue * 60;
      } else if (["second", "seconds", "sec", "secs"].includes(rawUnit)) {
        normalizedValue = rawValue / 60;
      } else {
        throw createClientError("sleep_duration unit must be minutes, hours, or seconds");
      }

      return {
        metricType,
        normalizedValue: roundNumber(normalizedValue),
        normalizedUnit: "minutes",
      };
    }
    case "calories_burned": {
      if (rawValue < 0) {
        throw createClientError("calories_burned value must be zero or greater");
      }

      let normalizedValue;
      if (["kcal"].includes(rawUnit)) {
        normalizedValue = rawValue;
      } else if (["cal", "calorie", "calories"].includes(rawUnit)) {
        normalizedValue = rawValue / 1000;
      } else {
        throw createClientError("calories_burned unit must be kcal or cal");
      }

      return {
        metricType,
        normalizedValue: roundNumber(normalizedValue),
        normalizedUnit: "kcal",
      };
    }
    default:
      throw createClientError(`Unsupported metric type: ${metricType}`);
  }
}

function normalizePayload(userId, payload) {
  const source = normalizeSource(payload.source);
  const recordedAt = new Date(payload.recorded_at);
  if (Number.isNaN(recordedAt.getTime())) {
    throw createClientError("recorded_at must be a valid ISO-8601 timestamp");
  }

  const metrics = payload.metrics || {};
  const metricKeys = Object.keys(metrics).filter((key) => SUPPORTED_METRICS.includes(key));

  if (!metricKeys.length) {
    throw createClientError("At least one supported metric is required", {
      supportedMetrics: SUPPORTED_METRICS,
    });
  }

  const device = payload.device || {};
  const receivedAt = new Date().toISOString();

  return metricKeys.map((metricType) => {
    const metricPayload = metrics[metricType];
    if (!metricPayload || typeof metricPayload !== "object") {
      throw createClientError(`Metric ${metricType} must be an object with value and unit`);
    }

    const normalized = normalizeMetricValue(metricType, metricPayload);

    return {
      user_id: userId,
      source,
      device_id: device.id || null,
      device_name: device.name || null,
      metric_type: normalized.metricType,
      metric_value: normalized.normalizedValue,
      metric_unit: normalized.normalizedUnit,
      recorded_at: recordedAt.toISOString(),
      received_at: receivedAt,
      timezone: payload.timezone || null,
      metadata: {
        originalValue: Number(metricPayload.value),
        originalUnit: String(metricPayload.unit || "").trim(),
      },
    };
  });
}

function buildLatestMetrics(records) {
  const latestMetrics = {};

  for (const record of records || []) {
    if (!latestMetrics[record.metric_type]) {
      latestMetrics[record.metric_type] = {
        value: record.metric_value,
        unit: record.metric_unit,
        recordedAt: record.recorded_at,
        source: record.source,
        device: {
          id: record.device_id || null,
          name: record.device_name || null,
        },
      };
    }
  }

  return latestMetrics;
}

async function ingestWearableData(userId, payload) {
  const normalizedRecords = normalizePayload(userId, payload);
  const storedRecords = await wearableDataRepository.insertWearableData(normalizedRecords);

  return {
    success: true,
    source: normalizedRecords[0]?.source || null,
    recordedAt: normalizedRecords[0]?.recorded_at || null,
    metricsStored: normalizedRecords.length,
    records: storedRecords,
  };
}

async function getLatestWearableSummary(userId, limit = 50) {
  const records = await wearableDataRepository.getLatestWearableDataByUserId(userId, limit);

  return {
    success: true,
    count: records.length,
    latestMetrics: buildLatestMetrics(records),
    records,
  };
}

module.exports = {
  SUPPORTED_METRICS,
  SUPPORTED_SOURCES,
  getLatestWearableSummary,
  ingestWearableData,
  normalizePayload,
};
