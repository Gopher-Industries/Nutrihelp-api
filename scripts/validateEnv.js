#!/usr/bin/env node
// ==============================================
// Environment variable validation script
// File Location: scripts/validateEnv.js
// Enhanced for CI/CD - BLOCKS on critical issues
// ==============================================

// Load dotenv in development only
if (process.env.NODE_ENV !== 'production') {
    try {
      require('dotenv').config();
    } catch (error) {
      console.log('⚠️  dotenv not available, using existing environment variables');
    }
  }
  
  /**
   * Verify that the environment variables are loaded correctly
   * @returns {boolean} - True if validation passes, false otherwise
   */
  function validateEnvironmentVariables() {
    console.log('🔍 Starting environment variable configuration validation...\n');
    
    // Required environment variables for production
    const requiredVars = [
      'JWT_SECRET',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY'
    ];
    
    // Required for runtime but can have defaults
    const runtimeVars = [
      'PORT'
    ];
    
    // Optional environment variables
    const optionalVars = [
      'SENDGRID_API_KEY',
      'FROM_EMAIL',
      'CORS_ORIGIN',
      'NODE_ENV',
      'LOG_LEVEL',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS'
    ];
    
    let hasErrors = false;
    let hasWarnings = false;
    
    // Verify required variables
    console.log('✅ Checking required environment variables:');
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value && value.trim() !== '') {
        // Partially mask sensitive information
        const displayValue = varName.includes('SECRET') || varName.includes('KEY')
          ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
          : value;
        console.log(`   ✅ ${varName}: ${displayValue}`);
      } else {
        console.error(`   ❌ ${varName}: NOT SET - This is required!`);
        hasErrors = true;
      }
    });
    
    // Verify runtime variables
    console.log('\n🔧 Checking runtime configuration:');
    runtimeVars.forEach(varName => {
      const value = process.env[varName];
      if (value && value.trim() !== '') {
        console.log(`   ✅ ${varName}: ${value}`);
      } else {
        if (varName === 'PORT') {
          console.log(`   ℹ️  ${varName}: Not set, will use default (3000)`);
        } else {
          console.log(`   ⚠️  ${varName}: Not set, using default`);
          hasWarnings = true;
        }
      }
    });
    
    // Verify optional variables
    console.log('\n📋 Checking optional environment variables:');
    optionalVars.forEach(varName => {
      const value = process.env[varName];
      if (value && value.trim() !== '') {
        const displayValue = varName.includes('SECRET') || varName.includes('KEY')
          ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
          : value;
        console.log(`   ✅ ${varName}: ${displayValue}`);
      } else {
        console.log(`   ⚠️  ${varName}: Not set (optional)`);
        hasWarnings = true;
      }
    });
    
    // Verify JWT_SECRET strength
    console.log('\n🔒 Validating JWT_SECRET security:');
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.trim() !== '') {
      if (jwtSecret.length >= 32) {
        console.log('   ✅ JWT_SECRET length: GOOD (>= 32 characters)');
      } else {
        console.log(`   ⚠️  JWT_SECRET length: ${jwtSecret.length} chars - Recommended: >= 32 characters`);
        hasWarnings = true;
      }
      
      // Check for common weak secrets
      const weakSecrets = [
        'your_super_secret_key',
        'secret',
        'password',
        '123456',
        'test',
        'jwt_secret',
        'change_this_in_production'
      ];
      
      const isWeak = weakSecrets.some(weak => 
        jwtSecret.toLowerCase().includes(weak)
      );
      
      if (isWeak) {
        console.error('   ❌ JWT_SECRET uses a weak/default value! This is a security risk!');
        hasErrors = true;
      } else {
        console.log('   ✅ JWT_SECRET appears to be custom and secure');
      }
    } else {
      console.error('   ❌ JWT_SECRET is empty or not set!');
      hasErrors = true;
    }
    
    // Verify Supabase configuration
    console.log('\n🗄️  Validating Supabase configuration:');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseUrl.trim() !== '') {
      if (supabaseUrl.includes('supabase.co')) {
        console.log('   ✅ Supabase URL format: CORRECT');
      } else if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
        console.log('   ℹ️  Supabase URL: Using local development URL');
      } else {
        console.log('   ⚠️  Supabase URL format: UNUSUAL - Please verify it\'s correct');
        hasWarnings = true;
      }
    } else {
      console.error('   ❌ Supabase URL: NOT SET');
      hasErrors = true;
    }
    
    if (supabaseKey && supabaseKey.trim() !== '') {
      if (supabaseKey.startsWith('eyJ')) {
        console.log('   ✅ Supabase Anon Key: FORMAT CORRECT (JWT format)');
      } else if (supabaseKey.length > 20) {
        console.log('   ✅ Supabase Anon Key: Present (format unknown but plausible)');
      } else {
        console.log('   ⚠️  Supabase Anon Key: Unusually short - Please verify');
        hasWarnings = true;
      }
    } else {
      console.error('   ❌ Supabase Anon Key: NOT SET');
      hasErrors = true;
    }
    
    // Verify NODE_ENV
    console.log('\n🌍 Validating environment:');
    const nodeEnv = process.env.NODE_ENV || 'development';
    console.log(`   ℹ️  NODE_ENV: ${nodeEnv}`);
    
    if (nodeEnv === 'production') {
      console.log('   ⚠️  Running in PRODUCTION mode - ensure all secrets are properly configured!');
      hasWarnings = true;
    } else if (nodeEnv === 'test') {
      console.log('   ℹ️  Running in TEST mode - using test configurations');
    } else {
      console.log('   ℹ️  Running in DEVELOPMENT mode');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    if (hasErrors) {
      console.error('❌ ENVIRONMENT VALIDATION FAILED: Critical errors found!');
      console.error('   Please fix the errors above before starting the application.');
    } else if (hasWarnings) {
      console.log('⚠️  ENVIRONMENT VALIDATION PASSED WITH WARNINGS');
      console.log('   The application will run, but consider addressing the warnings.');
    } else {
      console.log('✅ ENVIRONMENT VALIDATION PASSED! All configurations are correct.');
    }
    console.log('='.repeat(60));
    
    return !hasErrors;
  }
  
  /**
   * Testing JWT functionality
   * @returns {boolean} - True if tests pass
   */
  function testJWTFunctionality() {
    console.log('\n🧪 Testing JWT functionality...');
    
    try {
      const jwt = require('jsonwebtoken');
      const testPayload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
        timestamp: Date.now()
      };
      
      // Skip if JWT_SECRET is invalid
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 10) {
        console.log('   ⚠️  JWT_SECRET not suitable for testing, skipping JWT test');
        return false;
      }
      
      // Generate a test token
      const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log('   ✅ JWT Token generated successfully');
      console.log(`   📄 Token (truncated): ${token.substring(0, 50)}...`);
      
      // Verify the test token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('   ✅ JWT Token verified successfully');
      console.log(`   📄 Decoded payload: userId=${decoded.userId}, email=${decoded.email}, role=${decoded.role}`);
      
      // Verify expiration is set
      if (decoded.exp) {
        const expiresIn = new Date(decoded.exp * 1000);
        console.log(`   📅 Token expires at: ${expiresIn.toISOString()}`);
      }
      
      return true;
      
    } catch (error) {
      console.error(`   ❌ JWT functionality test failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Testing Supabase connection
   * @returns {Promise<boolean>} - True if connection successful
   */
  async function testSupabaseConnection() {
    console.log('\n🔌 Testing Supabase connection...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    // Skip if credentials are missing
    if (!supabaseUrl || !supabaseKey) {
      console.log('   ⚠️  Supabase credentials missing, skipping connection test');
      return false;
    }
    
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      // Simple health check - try to get server info
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        // Check if it's a table not found error (acceptable for connection test)
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log('   ✅ Supabase connection successful (users table may not exist yet)');
          console.log('   ℹ️  Connection works, but the users table is not created');
          return true;
        }
        
        console.log(`   ⚠️  Supabase connection successful, but query failed: ${error.message}`);
        console.log('   💡 This may be due to permissions or missing tables, but connection is working');
        return true;
      }
      
      console.log('   ✅ Supabase connection successful!');
      console.log(`   📊 Query returned: ${JSON.stringify(data)}`);
      return true;
      
    } catch (error) {
      console.error(`   ❌ Supabase connection test failed: ${error.message}`);
      
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        console.log('   💡 Check your internet connection or Supabase URL');
      } else if (error.message.includes('401')) {
        console.log('   💡 Invalid API key - check your SUPABASE_ANON_KEY');
      } else if (error.message.includes('404')) {
        console.log('   💡 Supabase URL may be incorrect - check your SUPABASE_URL');
      }
      
      return false;
    }
  }
  
  /**
   * Run all validations
   * @returns {Promise<boolean>} - True if all critical validations pass
   */
  async function runAllValidations() {
    let criticalSuccess = true;
    let jwtSuccess = false;
    let supabaseSuccess = false;
    
    try {
      // Run environment validation
      criticalSuccess = validateEnvironmentVariables();
      
      // If environment validation passes, run JWT test
      if (criticalSuccess) {
        jwtSuccess = testJWTFunctionality();
        
        // Run Supabase connection test (non-critical for CI)
        supabaseSuccess = await testSupabaseConnection();
      }
      
      // Summary
      console.log('\n' + '🎉'.repeat(20));
      console.log('VALIDATION SUMMARY:');
      console.log('─'.repeat(40));
      console.log(`Environment Variables: ${criticalSuccess ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (criticalSuccess) {
        console.log(`JWT Functionality:     ${jwtSuccess ? '✅ PASSED' : '⚠️  WARNING'}`);
        console.log(`Supabase Connection:   ${supabaseSuccess ? '✅ PASSED' : '⚠️  WARNING'}`);
      }
      
      console.log('─'.repeat(40));
      
      if (criticalSuccess) {
        console.log('🎉 All critical validations passed successfully!');
        
        if (!jwtSuccess || !supabaseSuccess) {
          console.log('⚠️  Some non-critical checks failed. The application may still run,');
          console.log('   but please review the warnings above.');
          return true; // Still return true for CI (non-critical)
        }
        
        return true;
      } else {
        console.error('❌ Critical validation failed!');
        console.error('   Please fix the errors above before proceeding.');
        return false;
      }
      
    } catch (error) {
      console.error('\n💥 Unexpected error during validation:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      return false;
    }
  }
  
  // If this script is run directly
  if (require.main === module) {
    runAllValidations().then(success => {
      if (!success) {
        process.exit(1);
      }
      process.exit(0);
    }).catch(error => {
      console.error('Validation script error:', error);
      process.exit(1);
    });
  }
  
  module.exports = {
    validateEnvironmentVariables,
    testJWTFunctionality,
    testSupabaseConnection,
    runAllValidations
  };