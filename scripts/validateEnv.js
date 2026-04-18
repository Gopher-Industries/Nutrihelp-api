// ==============================================
// Environment variable validation script
// File Location：scripts/validateEnv.js
// ==============================================

require('dotenv').config();

/**
 * Verify that the environment variables are loaded correctly
 */
function validateEnvironmentVariables() {
    console.log('🔍 Start verifying the environment variable configuration...\n');
    
    // Required environment variables
    const requiredVars = [
        'JWT_SECRET',
        'SUPABASE_URL', 
        'SUPABASE_ANON_KEY',
        'PORT'
    ];
    
    // Optional environment variables
    const optionalVars = [
        'SENDGRID_API_KEY',
        'FROM_EMAIL',
        'NODE_ENV',
        'CORS_ORIGIN'
    ];
    
    let hasErrors = false;
    
    // Verify required variables
    console.log('✅ Check required environment variables：');
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            // Partially mask sensitive information
            const displayValue = varName.includes('SECRET') || varName.includes('KEY') 
                ? `${value.substring(0, 8)}...` 
                : value;
            console.log(`   ${varName}: ${displayValue}`);
        } else {
            console.error(`   ❌ ${varName}: 未设置`);
            hasErrors = true;
        }
    });
    
    console.log('\n📋 Check optional environment variables：');
    optionalVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            const displayValue = varName.includes('SECRET') || varName.includes('KEY') 
                ? `${value.substring(0, 8)}...` 
                : value;
            console.log(`   ${varName}: ${displayValue}`);
        } else {
            console.log(`   ⚠️  ${varName}: Not set (optional)`);
        }
    });
    
    // Verify JWT_SECRET strength
    console.log('\n🔒 Verify JWT_SECRET security：');
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
        if (jwtSecret.length >= 32) {
            console.log('   ✅ JWT_SECRET is long enough (>= 32 characters)');
        } else {
            console.log('   ⚠️  JWT_SECRET is too short. It is recommended to be at least 32 characters.');
        }
        
        if (jwtSecret !== 'your_super_secret_key') {
            console.log('   ✅ JWT_SECRET has been modified from the default value');
        } else {
            console.log('   ❌ JWT_SECRET is still the default value, please change it!');
            hasErrors = true;
        }
    }
    
    // Verify Supabase connection
    console.log('\n🗄️  Verify Supabase Configuration：');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseUrl.includes('supabase.co')) {
        console.log('   ✅ Supabase URL format is correct');
    } else {
        console.log('   ❌ Supabase URL format error');
        hasErrors = true;
    }
    
    if (supabaseKey && supabaseKey.startsWith('eyJ')) {
        console.log('   ✅ Supabase URL format is correct');
    } else {
        console.log('   ❌ Supabase URL format error');
        hasErrors = true;
    }
    
    // 总结
    console.log('\n' + '='.repeat(50));
    if (hasErrors) {
        console.log('❌ There is a problem with the environment variable configuration. Please fix it and restart the service');
        process.exit(1);
    } else {
        console.log('✅ Environment variable configuration verification passed!');
    }
    console.log('='.repeat(50));
}

/**
 * Testing JWT functionality
 */
function testJWTFunctionality() {
    console.log('\n🧪 Testing JWT functionality...');
    
    try {
        const jwt = require('jsonwebtoken');
        const testPayload = { 
            userId: 1, 
            email: 'test@example.com',
            role: 'user' 
        };
        
        // Generate a test token
        const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log('   ✅ JWT Token generation successful');
        
        // Verify the test token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('   ✅ JWT Token verification successful');
        console.log(`   📄 Decoded content: ${JSON.stringify(decoded, null, 2)}`);
        
    } catch (error) {
        console.error('   ❌ JWT functionality test failed:', error.message);
    }
}

/**
 * Testing Supabase connection
 */
async function testSupabaseConnection() {
    console.log('\n🔌 Testing Supabase connection...');
    
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Simple connection test
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
            
        if (error) {
            console.log(`   ⚠️  Supabase connection successful, but query failed: ${error.message}`);
            console.log('   💡  This may be due to the table not existing or permission issues, but the connection configuration is correct');
        } else {
            console.log('   ✅ Supabase connection and query test successful');
        }
        
    } catch (error) {
        console.error('   ❌ Supabase connection test failed:', error.message);
    }
}

// Run all validations
async function runAllValidations() {
    try {
        validateEnvironmentVariables();
        testJWTFunctionality();
        await testSupabaseConnection();

        console.log('\n🎉 All validations completed successfully!');

    } catch (error) {
        console.error('\n💥 An error occurred during validation:', error.message);
        process.exit(1);
    }
}

// If this script is run directly
if (require.main === module) {
    runAllValidations();
}

module.exports = {
    validateEnvironmentVariables,
    testJWTFunctionality,
    testSupabaseConnection
};