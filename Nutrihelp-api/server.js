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
const helmet = require('helmet');
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// ✅ Create the app BEFORE using it
const app = express();
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 443;
const HTTP_PORT = Number(process.env.HTTP_PORT || process.env.PORT) || 80;

// CORS configuration (minimal for TLS demo)
const corsOptions = {
  origin: ["http://localhost", "https://localhost"],
  credentials: true,
};
app.use(cors(corsOptions));

// TLS 1.3 Hardening: HSTS header via Helmet
app.use(helmet({
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
}));

// Basic middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Sample route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', tls: '1.3 enforced' });
});

// TLS 1.3 Hardening: Enforce TLS 1.3 only
const tlsKeyPath = process.env.TLS_KEY_PATH || path.join(__dirname, 'certs', 'local-key.pem');
const tlsCertPath = process.env.TLS_CERT_PATH || path.join(__dirname, 'certs', 'local-cert.pem');

let httpsServer;
try {
  const tlsOptions = {
    key: fs.readFileSync(tlsKeyPath),
    cert: fs.readFileSync(tlsCertPath),
    // TLS 1.3 Enforcement: Only allow TLS 1.3
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

// TLS 1.3 Hardening: HTTP → HTTPS redirect
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
  console.log('='.repeat(50));
});

redirectServer.listen(HTTP_PORT);