const MAX_RECENT_REQUESTS = 200;

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
};

function normalizePath(pathname) {
  return String(pathname || '').trim() || 'unknown';
}

function classifyStatus(statusCode) {
  const code = Number(statusCode) || 0;
  if (code >= 500) return 'serverError';
  if (code >= 400) return 'clientError';
  return 'success';
}

function recordRequest({
  method,
  path,
  statusCode,
  duration,
  requestId,
  userId = null,
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
  };
}

module.exports = {
  recordRequest,
  getSnapshot,
};
