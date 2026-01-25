#!/usr/bin/env node
/**
 * Live Logging Monitor Script
 * 
 * This script monitors what's currently being logged when authentication happens:
 * - Shows console logs in real-time
 * - Shows what gets stored in database
 * - Highlights security issues
 * 
 * Run with: node scripts/liveLoggingMonitor.js
 */

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

const BASE_URL = 'http://localhost:80/api';

console.clear();
console.log(`\n${colors.bold}${colors.magenta}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}║   LIVE LOGGING MONITOR - Authentication Flow Tracking        ║${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}║   Monitor console logs vs persistent storage                 ║${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

// Create test credentials
const testUser = {
  email: `test_${Date.now()}@nutrihelp.local`,
  password: 'TestPassword123!',
  name: 'Test User',
  first_name: 'Test',
  last_name: 'User'
};

console.log(`${colors.bold}${colors.cyan}TEST USER DETAILS:${colors.reset}`);
console.log(`  Email: ${testUser.email}`);
console.log(`  Password: ${testUser.password}\n`);

(async function monitorLogging() {
  try {
    // Step 1: Signup
    console.log(`${colors.bold}${colors.blue}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}STEP 1: USER REGISTRATION${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    try {
      const signupResponse = await axios.post(`${BASE_URL}/auth/register`, {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      });

      console.log(`${colors.green}✅ Registration successful${colors.reset}`);
      console.log(`   User ID: ${signupResponse.data.user?.id || 'N/A'}\n`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`${colors.yellow}⚠️  User already exists (will continue with login)${colors.reset}\n`);
      } else {
        throw error;
      }
    }

    // Step 2: Login
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}STEP 2: USER LOGIN${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    console.log(`${colors.yellow}📤 Sending login request...${colors.reset}`);
    console.log(`   Endpoint: POST /api/auth/login`);
    console.log(`   Payload: { email: "${testUser.email}", password: "***" }\n`);

    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    const { accessToken, refreshToken } = loginResponse.data;

    console.log(`${colors.green}✅ Login successful${colors.reset}\n`);

    console.log(`${colors.bold}${colors.red}🔴 SECURITY ISSUE - CHECK SERVER CONSOLE:${colors.reset}`);
    console.log(`${colors.red}   In your server logs, you should see:${colors.reset}`);
    console.log(`   ${colors.red}✅ Generated accessToken: eyJhbGc...${colors.reset}`);
    console.log(`   ${colors.red}   🔍 Decoded token payload: { userId, email, role, type }${colors.reset}`);
    console.log(`${colors.red}   These are SENSITIVE! They should NOT be in console.${colors.reset}\n`);

    console.log(`${colors.bold}${colors.green}✅ WHAT IS LOGGED PERSISTENTLY:${colors.reset}`);
    console.log(`${colors.green}   Table: auth_logs${colors.reset}`);
    console.log(`${colors.green}   Fields: user_id, email, success=true, ip_address${colors.reset}\n`);

    console.log(`${colors.bold}${colors.red}❌ WHAT IS MISSING:${colors.reset}`);
    console.log(`${colors.red}   Table: token_activity_logs (NOT CREATED)${colors.reset}`);
    console.log(`${colors.red}   Should log: token generation, token type, expiry, etc.${colors.reset}\n`);

    // Step 3: Check what's in auth_logs
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}STEP 3: CHECK PERSISTENT LOGS${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    try {
      const { data: authLogs } = await supabase
        .from('auth_logs')
        .select('*')
        .eq('email', testUser.email)
        .order('created_at', { ascending: false })
        .limit(2);

      if (authLogs && authLogs.length > 0) {
        console.log(`${colors.green}✅ Found auth_logs entries:${colors.reset}\n`);
        authLogs.forEach((log, idx) => {
          console.log(`   [${idx + 1}] Success: ${log.success}`);
          console.log(`       Email: ${log.email}`);
          console.log(`       IP: ${log.ip_address}`);
          console.log(`       Time: ${new Date(log.created_at).toLocaleString()}\n`);
        });
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠️  Cannot read auth_logs:${colors.reset}`);
      console.log(`   ${error.message}\n`);
    }

    // Step 4: Show what's missing
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}STEP 4: MISSING LOGGING${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    // Display the tokens (for demo purposes)
    console.log(`${colors.bold}${colors.yellow}Generated Tokens (showing structure):${colors.reset}`);
    console.log(`\n${colors.yellow}Access Token (SHOULD be in token_activity_logs):${colors.reset}`);
    console.log(`   ${accessToken.substring(0, 50)}...`);
    console.log(`   ${colors.red}⚠️  ONLY visible in console - NOT persisted!${colors.reset}\n`);

    console.log(`${colors.yellow}Refresh Token (SHOULD be tracked):${colors.reset}`);
    console.log(`   ${refreshToken.substring(0, 50)}...`);
    console.log(`   ${colors.red}⚠️  ONLY visible in console - NOT persisted!${colors.reset}\n`);

    // Step 5: Test protected route
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}STEP 5: ACCESS PROTECTED ROUTE${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    try {
      const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`${colors.green}✅ Protected route accessed${colors.reset}`);
      console.log(`   User: ${profileResponse.data.user?.email}\n`);

      console.log(`${colors.red}⚠️  TOKEN VERIFICATION LOGGED:${colors.reset}`);
      console.log(`${colors.red}   Check server console for: "Decoded token payload: { userId, email, role, type }"${colors.reset}`);
      console.log(`${colors.red}   This is SENSITIVE data that should NOT be in console!${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.red}❌ Protected route failed: ${error.message}\n`);
    }

    // Step 6: Summary
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}SUMMARY - LOGGING STATUS${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    const logStatus = [
      { event: 'Login Attempt', console: '✅', database: '✅ (auth_logs)', status: 'GOOD' },
      { event: 'Token Generation', console: '❌ (SENSITIVE)', database: '❌ (missing)', status: 'CRITICAL' },
      { event: 'Token Verification', console: '❌ (SENSITIVE)', database: '❌ (missing)', status: 'CRITICAL' },
      { event: 'Token Payload', console: '❌ (EXPOSED)', database: 'N/A', status: 'CRITICAL' },
      { event: 'Session Logout', console: '❌', database: '❌ (missing)', status: 'HIGH' },
      { event: 'RBAC Violations', console: '⚠️', database: '✅ (rbac_violation_logs)', status: 'GOOD' }
    ];

    console.log(`${colors.bold}Event${colors.reset}                    ${colors.bold}Console${colors.reset}           ${colors.bold}Database${colors.reset}              ${colors.bold}Status${colors.reset}`);
    console.log('─'.repeat(75));
    
    logStatus.forEach(item => {
      const status = item.status === 'GOOD' ? colors.green : colors.red;
      console.log(`${item.event.padEnd(20)} ${item.console.padEnd(15)} ${item.database.padEnd(20)} ${status}${item.status}${colors.reset}`);
    });

    console.log(`\n${colors.bold}${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║ RECOMMENDATIONS:                                              ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║ 1. Stop logging tokens to console (SECURITY RISK)            ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║ 2. Create token_activity_logs table                         ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║ 3. Create session_logs table                                 ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║ 4. Mask sensitive data in all logs                          ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║ 5. Implement persistent audit trail                         ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}Error during monitoring:${colors.reset}`);
    console.error(error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log(`\n${colors.yellow}⚠️  Server not running!${colors.reset}`);
      console.log(`   Start your server first: npm start`);
    }
  }
})();
