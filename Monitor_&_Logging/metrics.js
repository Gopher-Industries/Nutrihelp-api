const client = require("prom-client");

// collect default system metrics (CPU, memory, etc.)
client.collectDefaultMetrics();

// ===== Metrics =====
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of requests",
  labelNames: ["method", "route", "status"],
});

const httpErrorsTotal = new client.Counter({
  name: "http_errors_total",
  help: "Total number of error responses",
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Request duration in seconds",
  labelNames: ["method", "route", "status"],
});

const authInvalidTokenAttempts = new client.Counter({
  name: "auth_invalid_token_attempts_total",
  help: "Number of failed access token validations",
  labelNames: ["route", "ip", "reason"],
});

const authRefreshRequests = new client.Counter({
  name: "auth_refresh_requests_total",
  help: "Number of token refresh requests",
  labelNames: ["route", "status"],
});

const sessionAuthenticatedRequests = new client.Counter({
  name: "session_authenticated_requests_total",
  help: "Number of authenticated session requests",
  labelNames: ["userId", "route", "status"],
});

const sessionSuspiciousEvents = new client.Counter({
  name: "session_suspicious_events_total",
  help: "Number of suspicious session events detected",
  labelNames: ["userId", "event_type", "ip"],
});

const WINDOW_MS = 60 * 1000;
const AUTH_INVALID_THRESHOLD = 6;
const REFRESH_REQUEST_THRESHOLD = 5;
const SESSION_REQUEST_THRESHOLD = 120;

const authFailureBuckets = new Map();
const refreshRequestBuckets = new Map();
const sessionRequestBuckets = new Map();

const sanitizeLabel = (value, fallback = "unknown") => {
  if (!value) return fallback;
  return String(value).slice(0, 100);
};

const pruneOldBuckets = (bucket) => {
  const now = Date.now();
  for (const [key, entry] of bucket.entries()) {
    if (now - entry.start > WINDOW_MS * 2) {
      bucket.delete(key);
    }
  }
};

const tickBucket = (bucket, key) => {
  const now = Date.now();
  const entry = bucket.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    bucket.set(key, { count: 1, start: now });
    return 1;
  }

  entry.count += 1;
  return entry.count;
};

const recordAuthInvalidTokenAttempt = ({ route, ip, reason }) => {
  const cleanRoute = sanitizeLabel(route);
  const cleanIp = sanitizeLabel(ip);
  const cleanReason = sanitizeLabel(reason);

  authInvalidTokenAttempts.inc({
    route: cleanRoute,
    ip: cleanIp,
    reason: cleanReason,
  });

  const bucketKey = `${cleanIp}:${cleanReason}:${cleanRoute}`;
  const failures = tickBucket(authFailureBuckets, bucketKey);
  pruneOldBuckets(authFailureBuckets);

  if (failures === AUTH_INVALID_THRESHOLD) {
    sessionSuspiciousEvents.inc({
      userId: "anonymous",
      event_type: "invalid_token_flood",
      ip: cleanIp,
    });
    console.warn(`Suspicious invalid token activity detected from ${cleanIp}. Route=${cleanRoute}, reason=${cleanReason}`);
  }
};

const recordRefreshRequest = ({ userId = "anonymous", route, status, ip }) => {
  const cleanRoute = sanitizeLabel(route);
  const cleanStatus = String(status);

  authRefreshRequests.inc({
    route: cleanRoute,
    status: cleanStatus,
  });

  if (status >= 400) {
    const bucketKey = `${userId}:${cleanRoute}:${ip}`;
    const failures = tickBucket(refreshRequestBuckets, bucketKey);
    pruneOldBuckets(refreshRequestBuckets);

    if (failures === REFRESH_REQUEST_THRESHOLD) {
      sessionSuspiciousEvents.inc({
        userId: sanitizeLabel(userId),
        event_type: "refresh_failures",
        ip: sanitizeLabel(ip),
      });
      console.warn(`Repeated refresh failures for user=${userId} from ip=${ip}`);
    }
  }
};

const recordAuthenticatedSession = ({ userId = "anonymous", route, sessionId, ip, status }) => {
  const cleanUserId = sanitizeLabel(userId);
  const cleanRoute = sanitizeLabel(route);
  const cleanIp = sanitizeLabel(ip);
  const cleanSessionId = sanitizeLabel(sessionId || "no-session");
  const cleanStatus = String(status);

  sessionAuthenticatedRequests.inc({
    userId: cleanUserId,
    route: cleanRoute,
    status: cleanStatus,
  });

  const bucketKey = `${cleanUserId}:${cleanSessionId}:${cleanRoute}`;
  const count = tickBucket(sessionRequestBuckets, bucketKey);
  pruneOldBuckets(sessionRequestBuckets);

  if (count === SESSION_REQUEST_THRESHOLD) {
    sessionSuspiciousEvents.inc({
      userId: cleanUserId,
      event_type: "high_request_velocity",
      ip: cleanIp,
    });
    console.warn(`High session request velocity detected for user=${cleanUserId} session=${cleanSessionId} route=${cleanRoute}`);
  }
};

// ===== Middleware =====
const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const route = req.route?.path || req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status: res.statusCode,
    });

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc();
    }

    end({
      method: req.method,
      route: route,
      status: res.statusCode,
    });
  });

  next();
};

// ===== Metrics endpoint handler =====
const metricsEndpoint = async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  recordAuthInvalidTokenAttempt,
  recordRefreshRequest,
  recordAuthenticatedSession,
};
