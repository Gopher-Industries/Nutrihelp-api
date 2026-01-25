#!/usr/bin/env node
/**
 * Logging Gap Demonstration Script
 * 
 * This script shows:
 * 1. What IS currently being logged (console + file + database)
 * 2. What is MISSING from persistent storage
 * 3. Security risks of current implementation
 * 
 * Run with: node scripts/demonstrateLoggingGaps.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

console.clear();
console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}║     NUTRIHELP BACKEND - LOGGING GAPS DEMONSTRATION               ║${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}║     Current State vs. Expected State                             ║${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

// ============================================================================
// SECTION 1: CURRENT LOGGING SOURCES
// ============================================================================
console.log(`${colors.bold}${colors.blue}📋 SECTION 1: CURRENT LOGGING INFRASTRUCTURE${colors.reset}\n`);

const loggingSources = [
  {
    name: 'Console Logging',
    status: '✅ ACTIVE',
    files: [
      'services/authService.js (line 146, 158, 285)',
      'controller/authController.js (line 96)',
      'middleware/authenticateToken.js (line 57)',
      'model/addMfaToken.js (multiple lines)'
    ],
    details: 'Server console only - NOT persistent',
    risk: '🔴 HIGH - Lost on server restart'
  },
  {
    name: 'File-based Logging',
    status: '✅ AVAILABLE',
    files: ['logs/ directory', 'errorLogService.js (not used in auth)'],
    details: 'File logging exists but NOT used for authentication',
    risk: '🟠 MEDIUM - Incomplete coverage'
  },
  {
    name: 'Database Logging (auth_logs)',
    status: '⚠️  PARTIAL',
    files: [
      'services/authService.js - logAuthAttempt()',
      'Table: auth_logs'
    ],
    details: 'Only login attempts logged (success/failure)',
    risk: '🟡 MEDIUM - Missing token lifecycle events'
  },
  {
    name: 'Database Logging (rbac_violation_logs)',
    status: '✅ IMPLEMENTED',
    files: [
      'middleware/authorizeRoles.js - logViolation()',
      'Table: rbac_violation_logs'
    ],
    details: 'RBAC violations logged persistently',
    risk: '✅ GOOD - This one is done!'
  }
];

loggingSources.forEach((source, idx) => {
  console.log(`${idx + 1}. ${source.name}`);
  console.log(`   Status: ${source.status}`);
  console.log(`   Files: ${source.files.join(', ')}`);
  console.log(`   Details: ${source.details}`);
  console.log(`   Risk Level: ${source.risk}`);
  console.log();
});

// ============================================================================
// SECTION 2: WHAT'S MISSING FROM PERSISTENT STORAGE
// ============================================================================
console.log(`\n${colors.bold}${colors.blue}🔍 SECTION 2: MISSING PERSISTENT LOGGING${colors.reset}\n`);

const missingLogging = [
  {
    event: 'Token Generation',
    current: '❌ Console only (line 158 in authService.js)',
    shouldBe: 'token_activity_logs table',
    impact: 'Cannot audit who generated what tokens',
    severity: '🔴 CRITICAL'
  },
  {
    event: 'Token Verification',
    current: '❌ Console error only (line 288 in authService.js)',
    shouldBe: 'token_activity_logs table',
    impact: 'Cannot track failed token validations',
    severity: '🔴 CRITICAL'
  },
  {
    event: 'Token Refresh',
    current: '❌ Not logged anywhere',
    shouldBe: 'token_activity_logs table',
    impact: 'No audit trail for refresh operations',
    severity: '🔴 CRITICAL'
  },
  {
    event: 'Session Logout',
    current: '❌ Not logged anywhere',
    shouldBe: 'session_logs table',
    impact: 'Cannot track user session lifecycle',
    severity: '🟠 HIGH'
  },
  {
    event: 'System Startup',
    current: '❌ Not logged anywhere',
    shouldBe: 'system_logs table',
    impact: 'No audit trail for server restarts',
    severity: '🟡 MEDIUM'
  }
];

missingLogging.forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.event}`);
  console.log(`   Current: ${item.current}`);
  console.log(`   Should Be: ${item.shouldBe}`);
  console.log(`   Impact: ${item.impact}`);
  console.log(`   Severity: ${item.severity}`);
  console.log();
});

// ============================================================================
// SECTION 3: SECURITY RISKS WITH CURRENT LOGGING
// ============================================================================
console.log(`\n${colors.bold}${colors.blue}⚠️  SECTION 3: SECURITY RISKS${colors.reset}\n`);

const securityRisks = [
  {
    risk: 'Sensitive Data Exposed in Console',
    description: 'Full JWT tokens logged to console (line 158, authService.js)',
    impact: 'Tokens visible in server logs, CI/CD logs, monitoring tools',
    exploitable: '🔴 YES - If logs are forwarded anywhere'
  },
  {
    risk: 'Token Payloads Logged',
    description: 'Decoded token payloads printed (line 285, authService.js)',
    impact: 'User roles, permissions, and claims visible in plaintext',
    exploitable: '🔴 YES - Reveals authorization structure'
  },
  {
    risk: 'No Persistent Audit Trail',
    description: 'Console logs disappear on server restart',
    impact: 'Cannot investigate security incidents after restart',
    exploitable: '🔴 YES - Attackers can hide tracks'
  },
  {
    risk: 'Incomplete Logging',
    description: 'Only auth_logs table used, not token_activity_logs',
    impact: 'Missing critical security events',
    exploitable: '🔴 YES - Impossible to detect token abuse'
  }
];

securityRisks.forEach((risk, idx) => {
  console.log(`${idx + 1}. ${colors.red}${risk.risk}${colors.reset}`);
  console.log(`   Description: ${risk.description}`);
  console.log(`   Impact: ${risk.impact}`);
  console.log(`   Exploitable: ${risk.exploitable}`);
  console.log();
});

// ============================================================================
// SECTION 4: LIVE DEMONSTRATION - SHOW ACTUAL CODE
// ============================================================================
console.log(`\n${colors.bold}${colors.blue}📂 SECTION 4: ACTUAL CODE IN YOUR PROJECT${colors.reset}\n`);

console.log(`${colors.bold}${colors.yellow}File: services/authService.js${colors.reset}`);
console.log(`${colors.yellow}Lines 146-158 (CURRENT - PROBLEM):${colors.reset}\n`);
console.log(`  ${colors.yellow}console.log("🔑 Signing access token with payload:", accessPayload);${colors.reset}`);
console.log(`  console.log("✅ Generated accessToken:", accessToken);`);
console.log(`\n  ${colors.red}🔴 ISSUE: Full token exposed to console!${colors.reset}\n`);

console.log(`${colors.yellow}Lines 285-288 (CURRENT - PROBLEM):${colors.reset}\n`);
console.log(`  ${colors.yellow}console.log("🔍 Decoded token payload:", decoded);${colors.reset}`);
console.log(`  console.error("❌ Token verification failed:", error.message);`);
console.log(`\n  ${colors.red}🔴 ISSUE: Token payload + error exposed!${colors.reset}\n`);

console.log(`${colors.yellow}Lines 296-310 (CURRENT - PARTIAL):${colors.reset}\n`);
console.log(`  async logAuthAttempt(userId, email, success, deviceInfo) {`);
console.log(`    await supabase.from('auth_logs').insert({...});`);
console.log(`  ${colors.green}✅ GOOD: Using auth_logs table${colors.reset}`);
console.log(`  ${colors.red}🔴 MISSING: No token lifecycle tracking${colors.reset}\n`);

// ============================================================================
// SECTION 5: DATABASE CHECK
// ============================================================================
console.log(`\n${colors.bold}${colors.blue}🗄️  SECTION 5: DATABASE TABLE STATUS${colors.reset}\n`);

(async function checkDatabaseTables() {
  try {
    const tables = [
      'auth_logs',
      'token_activity_logs',
      'session_logs',
      'rbac_violation_logs',
      'system_logs'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });

        if (error && error.code === '42P01') {
          console.log(`❌ ${table.padEnd(25)} - ${colors.red}NOT CREATED${colors.reset}`);
        } else if (error) {
          console.log(`⚠️  ${table.padEnd(25)} - ${colors.yellow}ERROR: ${error.message}${colors.reset}`);
        } else {
          console.log(`✅ ${table.padEnd(25)} - EXISTS (can store logs)`);
        }
      } catch (e) {
        console.log(`⚠️  ${table.padEnd(25)} - ${colors.yellow}CHECK FAILED${colors.reset}`);
      }
    }
  } catch (error) {
    console.log(`\n${colors.red}Cannot connect to Supabase. Check .env file.${colors.reset}`);
  }
})();

// ============================================================================
// SECTION 6: SUMMARY & RECOMMENDATIONS
// ============================================================================
console.log(`\n${colors.bold}${colors.blue}📊 SECTION 6: SUMMARY & RECOMMENDATIONS${colors.reset}\n`);

console.log(`${colors.bold}Current State:${colors.reset}`);
console.log(`  • Auth attempts logged to 'auth_logs' table ✅`);
console.log(`  • RBAC violations logged persistently ✅`);
console.log(`  • ${colors.red}Token lifecycle NOT logged (console only) ❌${colors.reset}`);
console.log(`  • ${colors.red}Session logout NOT logged ❌${colors.reset}`);
console.log(`  • ${colors.red}Sensitive data exposed in console logs ❌${colors.reset}`);

console.log(`\n${colors.bold}Required Changes:${colors.reset}`);
console.log(`  1. Remove console.log statements logging tokens`);
console.log(`  2. Add token_activity_logs table logging`);
console.log(`  3. Add session_logs table logging`);
console.log(`  4. Mask sensitive data in all logs`);
console.log(`  5. Implement system_logs for server events`);

console.log(`\n${colors.bold}${colors.green}Compliance Impact:${colors.reset}`);
console.log(`  • SOC 2: Currently ${colors.red}NON-COMPLIANT${colors.reset} (no persistent audit trail)`);
console.log(`  • ISO 27001: Currently ${colors.red}NON-COMPLIANT${colors.reset} (incomplete logging)`);
console.log(`  • GDPR: Currently ${colors.red}NON-COMPLIANT${colors.reset} (no access audit trail)`);

console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}║ Ready to implement fixes? Run:                                  ║${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}║ node scripts/demonstrateLoggingGaps.js                         ║${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
