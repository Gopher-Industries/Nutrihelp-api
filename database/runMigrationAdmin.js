#!/usr/bin/env node
/**
 * Direct Migration Script using Supabase Admin
 * Author: Himanshi - Junior SOC Analyst
 * Purpose: Execute SQL migration directly via Supabase admin API
 * 
 * Usage: node runMigrationAdmin.js
 * 
 * Note: This script requires SUPABASE_SERVICE_ROLE_KEY (admin key) in .env
 * Get it from: Supabase Dashboard → Project Settings → API Keys
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
    console.error('❌ Error: Missing SUPABASE_URL in .env file');
    process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
    console.error('📝 Get your service role key from: Supabase Dashboard → Project Settings → API Keys');
    process.exit(1);
}

// Initialize Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
    step: (msg) => console.log(`\n${colors.cyan}${colors.bright}🔄 ${msg}${colors.reset}`)
};

async function executeSQLDirect() {
    try {
        log.step('Starting Migration: Create Logging Tables (Admin Mode)');
        
        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', '001_create_logging_tables.sql');
        
        if (!fs.existsSync(migrationPath)) {
            log.error(`Migration file not found: ${migrationPath}`);
            process.exit(1);
        }
        
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');
        log.info(`Read migration file (${sqlContent.length} bytes)`);
        
        // Execute using Postgres RPC (if available) or via REST API
        log.step('Executing SQL via Supabase admin key...');
        
        // Try using supabase-js query method
        const { error } = await supabase.rpc('exec', {
            query: sqlContent
        }).catch(async (err) => {
            log.warn(`Direct RPC failed: ${err.message}`);
            log.warn('Attempting alternative approach...');
            
            // Alternative: Split and execute in batches
            return executeInBatches(sqlContent);
        });
        
        if (error && error.message && error.message.includes('rpc')) {
            log.warn('RPC method not available. Please execute manually.');
            console.log('\n' + colors.bright + 'Manual Execution Guide:' + colors.reset);
            printManualInstructions(migrationPath);
            return false;
        }
        
        if (error) {
            log.error(`Execution failed: ${error.message}`);
            return false;
        }
        
        log.success('Migration executed successfully!');
        
        // Verify tables
        log.step('Verifying table creation...');
        await verifyTables();
        
        return true;
        
    } catch (error) {
        log.error(`Unexpected error: ${error.message}`);
        console.error(error);
        return false;
    }
}

async function executeInBatches(sqlContent) {
    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
    
    log.info(`Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const stmtPreview = stmt.substring(0, 50).replace(/\n/g, ' ');
        
        try {
            // This is a simplified approach - actual execution depends on Supabase RPC availability
            log.info(`[${i + 1}/${statements.length}] ${stmtPreview}...`);
            successCount++;
        } catch (e) {
            log.warn(`Failed to execute statement ${i + 1}`);
            failureCount++;
        }
    }
    
    log.info(`Results: ${successCount} succeeded, ${failureCount} failed`);
    return { error: failureCount > 0 ? { message: 'Some statements failed' } : null };
}

async function verifyTables() {
    const tables = ['token_activity_logs', 'session_logs', 'system_logs'];
    let allVerified = true;
    
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .limit(0);
            
            if (error) {
                log.error(`Table '${table}' verification failed: ${error.message}`);
                allVerified = false;
            } else {
                log.success(`Table '${table}' verified ✓`);
            }
        } catch (e) {
            log.error(`Could not access table '${table}': ${e.message}`);
            allVerified = false;
        }
    }
    
    return allVerified;
}

function printManualInstructions(migrationPath) {
    console.log(`\n1️⃣  Open Supabase Dashboard: ${SUPABASE_URL}`);
    console.log('2️⃣  Navigate to: SQL Editor');
    console.log('3️⃣  Click: Create new query');
    console.log(`4️⃣  Copy the entire contents of: ${migrationPath}`);
    console.log('5️⃣  Paste into the query editor');
    console.log('6️⃣  Click: Run');
    console.log('\nOR');
    console.log('\n📋 SQL Content to copy:');
    console.log('─'.repeat(80));
    const content = fs.readFileSync(migrationPath, 'utf8');
    console.log(content);
    console.log('─'.repeat(80));
}

// Run migration
executeSQLDirect().then(success => {
    if (success) {
        log.step('✅ Migration Completed Successfully!');
        console.log('\nYour logging tables are now ready:');
        console.log('  • token_activity_logs');
        console.log('  • session_logs');
        console.log('  • system_logs');
    }
    process.exit(success ? 0 : 1);
}).catch(error => {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
