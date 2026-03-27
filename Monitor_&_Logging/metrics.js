let client = null;

try {
  client = require("prom-client");
  client.collectDefaultMetrics();
} catch (error) {
  console.warn("[metrics] prom-client is unavailable; metrics endpoints are running in no-op mode");
}

let httpRequestsTotal = null;
let httpErrorsTotal = null;
let httpRequestDuration = null;

if (client) {
  httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of requests",
    labelNames: ["method", "route", "status"],
  });

  httpErrorsTotal = new client.Counter({
    name: "http_errors_total",
    help: "Total number of error responses",
  });

  httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Request duration in seconds",
    labelNames: ["method", "route", "status"],
  });
}

const metricsMiddleware = (req, res, next) => {
  if (!client) {
    next();
    return;
  }

  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const route = req.route?.path || req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: res.statusCode,
    });

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc();
    }

    end({
      method: req.method,
      route,
      status: res.statusCode,
    });
  });

  next();
};

const metricsEndpoint = async (req, res) => {
  if (!client) {
    res.status(503).json({
      success: false,
      error: "Metrics are unavailable because prom-client is not installed",
    });
    return;
  }

  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
};
