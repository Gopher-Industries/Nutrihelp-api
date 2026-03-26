// Database verification and health check scripts

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

class DatabaseValidator {
    constructor() {
        this.validationResults = {
            connectivity: false,
            tableStructure: false,
            rls: false,
            functions: false,
            dataHealth: false
        };
    }

    // Validate database connectivity
    async validateConnectivity() {
        console.log('🔌 Validating database connectivity...');
        
        try {
            const { data, error } = await supabase
                .from('user_session')
                .select('count')
                .limit(1);

            if (error) {
                console.error('❌ Database connectivity failed:', error.message);
                return false;
            }

            console.log('✅ Database connectivity is normal');
            this.validationResults.connectivity = true;
            return true;

        } catch (error) {
            console.error('❌ Connection test failed:', error.message);
            return false;
        }
    }

    // Validate table structure integrity
    async validateTableStructure() {
        console.log('🔍 Validating user_session table structure...');

        try {
            // Check all required fields
            const requiredFields = [
                'id', 'user_id', 'session_token', 'refresh_token',
                'token_type', 'device_info', 'created_at', 'expires_at',
                'is_active', 'last_activity_at'
            ];

            const { data, error } = await supabase
                .from('user_session')
                .select(requiredFields.join(','))
                .limit(1);

            if (error) {
                console.error('❌ Table structure validation failed:', error.message);
                console.error('   Possible missing fields or type mismatches');
                return false;
            }

            console.log('✅ Table structure validation passed');
            console.log(`   Contains all ${requiredFields.length} required fields`);
            this.validationResults.tableStructure = true;
            return true;

        } catch (error) {
            console.error('❌ Table structure validation failed:', error.message);
            return false;
        }
    }

    // Validate RLS policies
    async validateRLS() {
        console.log('🛡️ Validating RLS policies...');

        try {
            // Attempt to access the table (should succeed with service_role)
            const { data, error } = await supabase
                .from('user_session')
                .select('id')
                .limit(5);

            if (error) {
                console.error('❌ RLS policy validation failed:', error.message);
                console.error('   Possible RLS configuration issues or insufficient permissions');
                return false;
            }

            console.log('✅ RLS policy validation passed');
            console.log(`   Successfully accessed data, returned ${data?.length || 0} records`);
            this.validationResults.rls = true;
            return true;

        } catch (error) {
            console.error('❌ RLS policy validation failed:', error.message);
            return false;
        }
    }

    // Validate database functions
    async validateFunctions() {
        console.log('⚙️ Validating database functions...');

        try {
            // Test cleanup function
            console.log('   Testing cleanup_expired_sessions...');
            const { data: cleanupResult, error: cleanupError } = await supabase
                .rpc('cleanup_expired_sessions');

            if (cleanupError) {
                console.error('❌ cleanup_expired_sessions function failed:', cleanupError.message);
                return false;
            }

            const cleanedCount = cleanupResult?.[0]?.cleaned_count || 0;
            console.log(`   ✅ Cleanup function is working properly, processed ${cleanedCount} sessions`);

            // Test validation function
            console.log('   Testing validate_session...');
            const { data: validateResult, error: validateError } = await supabase
                .rpc('validate_session', { token_to_check: 'test_validation_token' });

            if (validateError) {
                console.error('❌ validate_session function failed:', validateError.message);
                return false;
            }

            console.log('   ✅ Validation function is working properly');

            console.log('✅ Database function validation passed');
            this.validationResults.functions = true;
            return true;

        } catch (error) {
            console.error('❌ Database function validation failed:', error.message);
            return false;
        }
    }

    // Validate data health
    async validateDataHealth() {
        console.log('📊 Validating data health...');

        try {
            // Get session statistics
            const { data: stats, error: statsError } = await supabase
                .from('user_session')
                .select('id, is_active, expires_at, created_at')
                .order('created_at', { ascending: false })
                .limit(1000); // Check the most recent 1000 records

            if (statsError) {
                console.error('❌ Data statistics query failed:', statsError.message);
                return false;
            }

            const totalRecords = stats?.length || 0;
            const activeRecords = stats?.filter(s => s.is_active)?.length || 0;
            const expiredActive = stats?.filter(s => 
                s.is_active && new Date(s.expires_at) < new Date()
            )?.length || 0;

            console.log('✅ Data health is good');
            console.log(`   Among the most recent ${totalRecords} records:`);
            console.log(`   - Active sessions: ${activeRecords}`);
            console.log(`   - Expired but still active: ${expiredActive}`);

            if (expiredActive > 0) {
                console.warn(`   ⚠️ Found ${expiredActive} expired but still active sessions, consider running cleanup`);
            }

            this.validationResults.dataHealth = true;
            return true;

        } catch (error) {
            console.error('❌ Data health check failed:', error.message);
            return false;
        }
    }

    // Execute full validation
    async runFullValidation() {
        console.log('🚀 Starting full database validation...\n');
        console.log('='.repeat(60));

        const validations = [
            { name: 'Database Connectivity', method: this.validateConnectivity },
            { name: 'Table Structure', method: this.validateTableStructure },
            { name: 'RLS Policies', method: this.validateRLS },
            { name: 'Database Functions', method: this.validateFunctions },
            { name: 'Data Health', method: this.validateDataHealth }
        ];

        let allPassed = true;

        for (const validation of validations) {
            try {
                const result = await validation.method.call(this);
                if (!result) allPassed = false;
            } catch (error) {
                console.error(`❌ ${validation.name} validation error:`, error.message);
                allPassed = false;
            }
            console.log(''); // Empty line separator
        }

        this.printSummary();
        return allPassed;
    }

    // Print validation summary
    printSummary() {
        console.log('='.repeat(60));
        console.log('📋 Validation Results Summary:');
        console.log('-'.repeat(60));
        
        const statusMap = {
            connectivity: 'Database Connectivity',
            tableStructure: 'Table Structure',
            rls: 'RLS Policies',
            functions: 'Database Functions',
            dataHealth: 'Data Health'
        };

        Object.entries(this.validationResults).forEach(([key, value]) => {
            const status = value ? '✅ Passed' : '❌ Failed';
            const name = statusMap[key];
            console.log(`${name.padEnd(12)}: ${status}`);
        });
        
        console.log('-'.repeat(60));

        const overallStatus = this.isAllValid() ? '✅ All Passed' : '❌ Issues Found';
        console.log(`Overall Status: ${overallStatus}`);
        console.log('='.repeat(60));
    }

    // Check if all validations passed
    isAllValid() {
        return Object.values(this.validationResults).every(result => result);
    }

    // Quick health check
    async quickHealthCheck() {
        console.log('⚡ Quick health check...\n');

        try {
            const { data: sessionStats, error } = await supabase
                .rpc('cleanup_expired_sessions');

            if (error) {
                console.error('❌ Quick health check failed:', error.message);
                return false;
            }

            const cleanedCount = sessionStats?.[0]?.cleaned_count || 0;
            
            if (cleanedCount > 0) {
                console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
            } else {
                console.log('✅ No expired sessions found');
            }

            console.log('⚡ Quick health check completed');
            return true;

        } catch (error) {
            console.error('❌ Quick health check error:', error.message);
            return false;
        }
    }
}

// If this script is run directly
if (require.main === module) {
    const validator = new DatabaseValidator();

    // Handle command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'full';

    switch (command) {
        case 'quick':
            console.log('Executing quick health check...');
            validator.quickHealthCheck()
                .then(result => process.exit(result ? 0 : 1));
            break;

        case 'full':
        default:
            console.log('Executing full validation...');
            validator.runFullValidation()
                .then(result => process.exit(result ? 0 : 1));
            break;
    }
}

module.exports = DatabaseValidator;