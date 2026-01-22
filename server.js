require("dotenv").config();

// Debug environment variables
console.log('🔧 Environment Variables Check:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
console.log('   PORT:', process.env.PORT || '80 (default)');
console.log('');

const express = require("express");
const { errorLogger, responseTimeLogger } = require('./middleware/errorLogger');
const FRONTEND_ORIGIN =  "http://localhost:3000";

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
const port = process.env.PORT || 80;

// DB
let db = require("./dbConnection");

// System routes
app.use('/api/system', systemRoutes);

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1") ||
      origin.startsWith("http://localhost")
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true
}));
app.options("*", cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use((req, res, next) => { res.header("Access-Control-Allow-Credentials","true"); next(); });
app.set("trust proxy", 1);

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
app.listen(port, async () => {


  console.log('\n🎉 NutriHelp API launched successfully!');
  console.log('='.repeat(50));
  console.log(`Server is running on port ${port}`);
  console.log(`📚 Swagger UI: http://localhost/api-docs`);
  console.log('='.repeat(50));
  console.log('💡 Press Ctrl+C to stop the server \n');
  exec(`start http://localhost:${port}/api-docs`);
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use('/api/sms', require('./routes/sms'));


