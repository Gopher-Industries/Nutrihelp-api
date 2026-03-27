const AI_ADAPTER_VERSION = 'v1';
const DEFAULT_AI_TIMEOUT_MS = 3000;

function strictPositiveId(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) {
      return null;
    }
    return Number(trimmed);
  }

  return null;
}

function normalizeIdList(items) {
  return [
    ...new Set(
      (items || [])
        .map((item) => {
          if (item == null) return null;
          if (typeof item === 'number' || typeof item === 'string') return strictPositiveId(item);
          if (typeof item === 'object' && item.id != null) return strictPositiveId(item.id);
          return null;
        })
        .filter((item) => item != null)
    ),
  ];
}

function normalizeNameList(items) {
  return [
    ...new Set(
      (items || [])
        .map((item) => {
          if (!item) return null;
          if (typeof item === 'string') return item.trim().toLowerCase();
          return item.name ? String(item.name).trim().toLowerCase() : null;
        })
        .filter(Boolean)
    ),
  ];
}

function normalizeAiHints(rawHints = {}) {
  return {
    preferredCuisineIds: normalizeIdList(rawHints.preferredCuisineIds),
    preferredCookingMethodIds: normalizeIdList(rawHints.preferredCookingMethodIds),
    preferredRecipeIds: normalizeIdList(rawHints.preferredRecipeIds),
    excludedRecipeIds: normalizeIdList(rawHints.excludedRecipeIds),
    goalLabels: normalizeNameList(rawHints.goalLabels),
    prioritizeProtein: rawHints.prioritizeProtein === true,
    prioritizeFiber: rawHints.prioritizeFiber === true,
    limitSugar: rawHints.limitSugar === true,
    limitSodium: rawHints.limitSodium === true,
    explanationTags: normalizeNameList(rawHints.explanationTags),
  };
}

function deriveHintsFromMedicalReport(medicalReport) {
  const reports = Array.isArray(medicalReport) ? medicalReport : [medicalReport];
  const hints = {
    goalLabels: [],
    explanationTags: ['medical_report'],
  };

  reports.filter(Boolean).forEach((report) => {
    if (report?.diabetes_prediction?.diabetes === true) {
      hints.limitSugar = true;
      hints.goalLabels.push('blood sugar management');
      hints.explanationTags.push('diabetes_signal');
    }

    if (report?.obesity_prediction?.obesity_level) {
      hints.prioritizeFiber = true;
      hints.goalLabels.push('weight management');
      hints.explanationTags.push('obesity_signal');
    }
  });

  return normalizeAiHints(hints);
}

async function resolveAiRecommendationSignals({
  aiInsights = null,
  medicalReport = null,
  aiAdapterInput = null,
  fetchImpl = global.fetch,
  timeoutMs = DEFAULT_AI_TIMEOUT_MS,
} = {}) {
  if (aiInsights) {
    return {
      source: 'request',
      version: AI_ADAPTER_VERSION,
      fallbackUsed: false,
      adapterFailed: false,
      warnings: [],
      hints: normalizeAiHints(aiInsights),
    };
  }

  if (medicalReport) {
    return {
      source: 'medical_report',
      version: AI_ADAPTER_VERSION,
      fallbackUsed: false,
      adapterFailed: false,
      warnings: [],
      hints: deriveHintsFromMedicalReport(medicalReport),
    };
  }

  if (aiAdapterInput && process.env.AI_RECOMMENDATION_URL && typeof fetchImpl === 'function') {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(process.env.AI_RECOMMENDATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiAdapterInput),
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        throw new Error(`AI recommendation service error: ${response.status}`);
      }

      const payload = await response.json();
      return {
        source: 'ai_service',
        version: payload.version || AI_ADAPTER_VERSION,
        fallbackUsed: false,
        adapterFailed: false,
        warnings: [],
        hints: normalizeAiHints(payload.hints || payload),
      };
    } catch (error) {
      clearTimeout(timeoutHandle);
      return {
        source: 'none',
        version: AI_ADAPTER_VERSION,
        fallbackUsed: true,
        adapterFailed: true,
        warnings: [error.message],
        hints: normalizeAiHints({}),
      };
    }
  }

  if (aiAdapterInput && !process.env.AI_RECOMMENDATION_URL) {
    return {
      source: 'none',
      version: AI_ADAPTER_VERSION,
      fallbackUsed: true,
      adapterFailed: true,
      warnings: ['AI recommendation service is not configured'],
      hints: normalizeAiHints({}),
    };
  }

  return {
    source: 'none',
    version: AI_ADAPTER_VERSION,
    fallbackUsed: true,
    adapterFailed: false,
    warnings: [],
    hints: normalizeAiHints({}),
  };
}

module.exports = {
  AI_ADAPTER_VERSION,
  DEFAULT_AI_TIMEOUT_MS,
  resolveAiRecommendationSignals,
};
