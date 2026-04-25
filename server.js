require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { exec } = require('child_process');

const logger = require('./utils/logger');
const { requestLoggingMiddleware } = require('./middleware/requestLogger');
const { sessionMonitorMiddleware } = require('./middleware/sessionMonitor');
const { structuredErrorHandler } = require('./middleware/structuredErrorHandler');
const responseContractMiddleware = require('./middleware/responseContract');
const { localeMiddleware } = require('./utils/messages');

const { errorLogger, responseTimeLogger, uncaughtExceptionHandler, unhandledRejectionHandler } = require('./middleware/errorLogger');

const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const rateLimit = require('express-rate-limit');

const uploadRoutes = require('./routes/uploadRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { metricsMiddleware, metricsEndpoint } = require('./Monitor_&_Logging/metrics');

const FRONTEND_ORIGIN = 'http://localhost:3000';

// Debug environment variables
console.log('🔧 Environment Variables Check:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
console.log('   PORT:', process.env.PORT || '80 (default)');
console.log('');

const app = express();
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 443;
const HTTP_PORT = Number(process.env.HTTP_PORT || process.env.PORT) || 80;

// DB init (side-effect module)
let db = require('./dbConnection');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Create temp directory for uploads
const tempDir = path.join(uploadsDir, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('Created temp uploads directory');
}

// Cleanup temp files older than 1 day
function cleanupOldFiles() {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  try {
    for (const file of fs.readdirSync(tempDir)) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > ONE_DAY) fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error during file cleanup:', err);
  }
}
cleanupOldFiles();
setInterval(cleanupOldFiles, 3 * 60 * 60 * 1000);

// --- Trusted early middlewares ---
// Request logging MUST be first so we capture every request
app.use(requestLoggingMiddleware);
app.use(sessionMonitorMiddleware);
app.use(localeMiddleware);
app.use(responseContractMiddleware);

// CORS (whitelist-ish)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('chrome-extension://eggdlmopfankeonchoflhfoglaakobma') ||
      origin.startsWith('https://apifox.cn-hangzhou.log.aliyuncs.com')
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));
app.options('*', cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use((req, res, next) => { res.header('Access-Control-Allow-Credentials', 'true'); next(); });
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Swagger (fault-tolerant)
try {
  const swaggerDocument = yaml.load('./index.yaml');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('📚 Swagger loaded successfully');
} catch (e) {
  console.warn('⚠️  Swagger YAML failed to parse — /api-docs disabled:', String(e.message).split('\n')[0]);
}

// Response time and other logger middlewares
app.use(responseTimeLogger);

// Body parsers (after logging but before route handlers)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Monitoring & metrics
app.use(metricsMiddleware);
app.get('/api/metrics', metricsEndpoint);

// Small health/admin endpoints
app.get('/api/ai/stats', (req, res) => {
  const aiMonitor = require('./services/aiServiceMonitor');
  res.json({ success: true, data: aiMonitor.getStats() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', tls: '1.3 enforced' });
});

app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'NutriHelp API is running',
    uptime: process.uptime(),
    metrics: '/api/metrics',
    docs: '/api-docs',
  });
});
app.get('/', (req, res) => res.redirect('/api'));

// System routes (early in the chain, but after essential middleware)
app.use('/api/system', systemRoutes);

// Main routes registrar (single entry)
const routesRegistrar = require('./routes');
routesRegistrar(app);

// File uploads & static
app.use('/api', uploadRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/sms', require('./routes/sms'));
app.use('/security', require('./routes/securityEvents'));

// Error logging middleware (structured)
app.use(errorLogger);

// Structured error handler (translates errors to consistent responses)
app.use(structuredErrorHandler);

// Final fallback error handler (last resort)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  res.status(status).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
});

// Global process handlers
process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', unhandledRejectionHandler);

// Start HTTPS server with TLS 1.3 enforcement and an HTTP redirect server
const tlsKeyPath = process.env.TLS_KEY_PATH || path.join(__dirname, 'Nutrihelp-api', 'certs', 'local-key.pem');
const tlsCertPath = process.env.TLS_CERT_PATH || path.join(__dirname, 'Nutrihelp-api', 'certs', 'local-cert.pem');

let httpsServer;
try {
  const tlsOptions = {
    key: fs.readFileSync(tlsKeyPath),
    cert: fs.readFileSync(tlsCertPath),
    minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3',
  };
  httpsServer = https.createServer(tlsOptions, app);
} catch (tlsError) {
  console.error('Failed to load TLS certificates.');
  console.error(`Expected key at: ${tlsKeyPath}`);
  console.error(`Expected cert at: ${tlsCertPath}`);
  console.error(tlsError.message);
  process.exit(1);
}

const redirectServer = http.createServer((req, res) => {
  const host = (req.headers.host || 'localhost').replace(/:\d+$/, `:${HTTPS_PORT}`);
  const redirectUrl = `https://${host}${req.url || '/'}`;
  res.writeHead(301, { Location: redirectUrl });
  res.end();
});

httpsServer.listen(HTTPS_PORT, () => {
  console.log('\n🎉 NutriHelp API launched successfully!');
  console.log('='.repeat(50));
  console.log(`🔒 HTTPS server running on port ${HTTPS_PORT} (TLS 1.3 enforced)`);
  console.log(`🔁 HTTP redirect server running on port ${HTTP_PORT}`);
  console.log(`📚 Swagger UI: https://localhost:${HTTPS_PORT}/api-docs`);
  console.log('='.repeat(50));
  console.log('💡 Press Ctrl+C to stop the server \n');

  if (process.platform === 'win32') {
    exec(`start https://localhost:${HTTPS_PORT}/api-docs`);
  }
});

redirectServer.on('error', (err) => {
  if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
    console.warn(`⚠️ HTTP redirect server could not start on port ${HTTP_PORT} (${err.code}).`);
    console.warn('⚠️ HTTPS API is still running. For local testing, use https://localhost:${HTTPS_PORT} directly.');
    console.warn('⚠️ Optionally set HTTP_PORT=8081 in .env to test redirect without admin permissions.');
    return;
  }
  throw err;
});

redirectServer.listen(HTTP_PORT);
