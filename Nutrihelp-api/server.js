require('dotenv').config();

// Debug environment variables
console.log('🔧 Environment Variables Check:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
console.log('   PORT:', process.env.PORT || '80 (default)');
console.log('');

const express = require("express");
const http = require("http");
const https = require("https");
const { errorLogger, responseTimeLogger } = require('./middleware/errorLogger');
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://localhost:3000";

const helmet = require('helmet');
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const yaml = require("yamljs");
const { exec } = require("child_process");
const rateLimit = require('express-rate-limit');
const uploadRoutes = require('./routes/uploadRoutes');
const fs = require("fs");
const path = require("path");
const systemRoutes = require('./routes/systemRoutes');
const loginDashboard = require('./routes/loginDashboard.js');
const alertCheckerCron = require('./scripts/alertCheckerCron');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

// Create temp directory for uploads
const tempDir = path.join(__dirname, 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log("Created temp uploads directory");
}

// Cleanup temp files
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
    console.error("Error during file cleanup:", err);
  }
}
cleanupOldFiles();
setInterval(cleanupOldFiles, 3 * 60 * 60 * 1000);

// ✅ Create the app BEFORE using it
const app = express();
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 443;
const HTTP_PORT = Number(process.env.HTTP_PORT || process.env.PORT) || 80;

// DB
let db = require("./dbConnection");

// CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Whitelist localhost variants and extensions
    const allowedOrigins = [
      "http://localhost",
      "http://127.0.0.1",
      "https://localhost",
      "https://127.0.0.1",
      "chrome-extension://eggdlmopfankeonchoflhfoglaakobma",
    ];

    // Check for exact match or prefix match with port numbers
    const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
    
    if (isAllowed) {
      console.log(`[CORS] ✓ Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.error(`[CORS] ✗ Blocked origin: ${origin}`);
      callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Preflight handler for all routes
app.options('*', cors(corsOptions));

// Additional CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-JSON-Response-Length');
  next();
});
app.set('trust proxy', 1);

// System routes
app.use('/api/system', systemRoutes);
app.use('/api/login-dashboard', loginDashboard);

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'","'unsafe-inline'","https://cdn.jsdelivr.net"],
      styleSrc: ["'self'","'unsafe-inline'","https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, error: "Too many requests, please try again later." },
});
app.use(limiter);

// Swagger
const swaggerDocument = yaml.load("./index.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// Response time monitoring
app.use(responseTimeLogger);
// JSON & URL parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Main routes registrar
const routes = require("./routes");
routes(app);

// File uploads & static
app.use("/api", uploadRoutes);
app.use("/uploads", express.static("uploads"));

// Signup
app.use("/api/signup", require("./routes/signup"));

// Error handler
app.use(errorLogger);

// Final error handler
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;
        
    res.status(status).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
const { uncaughtExceptionHandler, unhandledRejectionHandler } = require('./middleware/errorLogger');
process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', unhandledRejectionHandler);

// Start
const tlsKeyPath = process.env.TLS_KEY_PATH || path.join(__dirname, 'certs', 'local-key.pem');
const tlsCertPath = process.env.TLS_CERT_PATH || path.join(__dirname, 'certs', 'local-cert.pem');

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

httpsServer.listen(HTTPS_PORT, async () => {

  alertCheckerCron.start();


  console.log('\n🎉 NutriHelp API launched successfully!');
  console.log('='.repeat(50));
  console.log(`🔒 HTTPS server running on port ${HTTPS_PORT} (TLS 1.3 enforced)`);
  console.log(`🔁 HTTP redirect server running on port ${HTTP_PORT}`);
  console.log(`📚 Swagger UI: https://localhost:${HTTPS_PORT}/api-docs`);
  console.log('='.repeat(50));
  console.log('💡 Press Ctrl+C to stop the server \n');
  exec(`start https://localhost:${HTTPS_PORT}/api-docs`);
});

redirectServer.on('error', (err) => {
  if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
    console.warn(`⚠️ HTTP redirect server could not start on port ${HTTP_PORT} (${err.code}).`);
    console.warn('⚠️ HTTPS API is still running. For local testing, use https://localhost:443 directly.');
    console.warn('⚠️ Optionally set HTTP_PORT=8081 in .env to test redirect without admin permissions.');
    return;
  }
  throw err;
});

redirectServer.listen(HTTP_PORT);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use('/api/sms', require('./routes/sms'));


