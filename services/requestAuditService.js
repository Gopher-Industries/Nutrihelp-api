const MAX_RECENT_REQUESTS = 200;
const MAX_RESPONSE_SAMPLE_BYTES = 12000;
const WATCHED_RESPONSE_PREFIXES = [
  '/api/recommendations',
  '/api/mealplan',
  '/api/recipe',
  '/api/barcode',
  '/api/imageClassification',
];

const runtime = {
  startedAt: new Date().toISOString(),
  requests: {
    total: 0,
    byPath: {},
    byStatusFamily: {
      success: 0,
      clientError: 0,
      serverError: 0,
    },
    recent: [],
  },
  responseSamples: {},
};

function normalizePath(pathname) {
  const normalized = String(pathname || '').trim() || 'unknown';
  return normalized.split('?')[0].replace(/\/+$/, '') || '/';
}

function classifyStatus(statusCode) {
  const code = Number(statusCode) || 0;
  if (code >= 500) return 'serverError';
  if (code >= 400) return 'clientError';
  return 'success';
}

function shouldCaptureSample(normalizedPath) {
  return WATCHED_RESPONSE_PREFIXES.find(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  ) || null;
}

function safeParseResponseBody(responseBody) {
  if (responseBody == null) return null;

  if (typeof responseBody === 'object') {
    return responseBody;
  }

  if (Buffer.isBuffer(responseBody)) {
    if (responseBody.length > MAX_RESPONSE_SAMPLE_BYTES) return null;
    responseBody = responseBody.toString('utf8');
  }

  if (typeof responseBody !== 'string') {
    return null;
  }

  const trimmed = responseBody.trim();
  if (!trimmed || trimmed.length > MAX_RESPONSE_SAMPLE_BYTES) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    return null;
  }
}

function recordRequest({
  method,
  path,
  statusCode,
  duration,
  requestId,
  userId = null,
  responseBody = null,
} = {}) {
  const normalizedPath = normalizePath(path);
  const normalizedMethod = String(method || 'GET').toUpperCase();
  const statusFamily = classifyStatus(statusCode);

  runtime.requests.total += 1;
  runtime.requests.byStatusFamily[statusFamily] += 1;

  if (!runtime.requests.byPath[normalizedPath]) {
    runtime.requests.byPath[normalizedPath] = {
      path: normalizedPath,
      total: 0,
      methods: {},
      lastStatusCode: null,
      lastCalledAt: null,
    };
  }

  const pathBucket = runtime.requests.byPath[normalizedPath];
  pathBucket.total += 1;
  pathBucket.lastStatusCode = Number(statusCode) || null;
  pathBucket.lastCalledAt = new Date().toISOString();
  pathBucket.methods[normalizedMethod] = (pathBucket.methods[normalizedMethod] || 0) + 1;

  runtime.requests.recent.unshift({
    method: normalizedMethod,
    path: normalizedPath,
    statusCode: Number(statusCode) || null,
    duration: Number(duration) || 0,
    requestId: requestId || null,
    userId: userId || null,
    at: new Date().toISOString(),
  });

  if (runtime.requests.recent.length > MAX_RECENT_REQUESTS) {
    runtime.requests.recent.length = MAX_RECENT_REQUESTS;
  }

  const samplePrefix = shouldCaptureSample(normalizedPath);
  const parsedResponseBody = safeParseResponseBody(responseBody);
  if (samplePrefix && parsedResponseBody) {
    runtime.responseSamples[samplePrefix] = {
      endpoint: samplePrefix,
      requestPath: normalizedPath,
      method: normalizedMethod,
      statusCode: Number(statusCode) || null,
      requestId: requestId || null,
      userId: userId || null,
      capturedAt: new Date().toISOString(),
      responseBody: parsedResponseBody,
    };
  }
}

function getSnapshot() {
  return {
    startedAt: runtime.startedAt,
    requests: {
      total: runtime.requests.total,
      byStatusFamily: { ...runtime.requests.byStatusFamily },
      byPath: Object.values(runtime.requests.byPath)
        .sort((left, right) => right.total - left.total),
      recent: runtime.requests.recent.slice(0, 50),
    },
    responseSamples: Object.values(runtime.responseSamples)
      .sort((left, right) => String(right.capturedAt).localeCompare(String(left.capturedAt))),
  };
}

module.exports = {
  recordRequest,
  getSnapshot,
};
