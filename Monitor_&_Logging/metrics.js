const client = require('prom-client');

// collect default system metrics (CPU, memory, etc.)
client.collectDefaultMetrics();

// ===== Metrics =====
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of requests',
  labelNames: ['method', 'route', 'status'],
});

const httpErrorsTotal = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of error responses',
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'route', 'status'],
});

// ===== Middleware =====
const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
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
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
};
