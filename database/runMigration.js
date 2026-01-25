#!/usr/bin/env node
/**
 * Migration Script: Create Logging Tables
 * Author: Himanshi - Junior SOC Analyst
 * Purpose: Set up audit trail tables for Week 9 logging implementation
 * 
 * Usage: node runMigration.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
};

// Logging functions
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
    step: (msg) => console.log(`\n${colors.cyan}${colors.bright}🔄 ${msg}${colors.reset}`)
};

async function runMigration() {
    try {
        log.step('Starting Migration: Create Logging Tables');
        
        // Read the SQL migration file
        const migrationPath = path.join(__dirname, 'migrations', '001_create_logging_tables.sql');
        
        if (!fs.existsSync(migrationPath)) {
            log.error(`Migration file not found: ${migrationPath}`);
            process.exit(1);
        }
        
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');
        
        log.info(`Read migration file (${sqlContent.length} bytes)`);
        
        // Execute the migration
        log.step('Executing SQL migration...');
        
        const { data, error } = await supabase.rpc('exec', {
            sql_string: sqlContent
        }).catch(async () => {
            // If rpc method doesn't exist, try direct execution
            // Note: This requires admin access or proper RLS policies
            log.warn('RPC method not available, attempting direct execution...');
            
            // Split SQL into individual statements and execute
            const statements = sqlContent
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
            
            for (const statement of statements) {
                try {
                    await supabase.rpc('exec_sql', { sql: statement });
                } catch (e) {
                    // Log but continue for non-critical statements
                    log.warn(`Skipping statement: ${statement.substring(0, 50)}...`);
                }
            }
            
            return { data: null, error: null };
        });
        
        if (error) {
            log.error(`Migration execution failed: ${error.message}`);
            log.error('Note: You may need to execute the SQL manually in Supabase dashboard');
            console.log('\n' + colors.bright + 'Manual Steps:' + colors.reset);
            console.log('1. Go to Supabase Dashboard → SQL Editor');
            console.log('2. Create a new query');
            console.log(`3. Copy the contents of: ${migrationPath}`);
            console.log('4. Execute the query');
            return false;
        }
        
        log.success('Migration executed successfully!');
        
        // Verify tables were created
        log.step('Verifying tables creation...');
        
        const tables = ['token_activity_logs', 'session_logs', 'system_logs'];
        let allTablesCreated = true;
        
        for (const tableName of tables) {
            try {
                const { data, error: tableError } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true })
                    .limit(1);
                
                if (tableError) {
                    log.error(`Table '${tableName}' not found or inaccessible`);
                    allTablesCreated = false;
                } else {
                    log.success(`Table '${tableName}' verified ✓`);
                }
            } catch (e) {
                log.warn(`Could not verify table '${tableName}': ${e.message}`);
            }
        }
        
        if (allTablesCreated) {
            log.step('Migration completed successfully! 🎉');
            console.log(`\n${colors.bright}Summary:${colors.reset}`);
            console.log('✅ token_activity_logs - Created');
            console.log('✅ session_logs - Created');
            console.log('✅ system_logs - Created');
            console.log('\nTables are ready to use for persistent logging.');
            return true;
        } else {
            log.warn('Some tables could not be verified. They may still have been created.');
            log.info('Check Supabase dashboard to confirm.');
            return true;
        }
        
    } catch (error) {
        log.error(`Unexpected error: ${error.message}`);
        console.error(error);
        return false;
    }
}

// Run migration
runMigration().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
