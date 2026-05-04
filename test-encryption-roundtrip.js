#!/usr/bin/env node

/**
 * Encryption Round-Trip Test and Vault Reachability Validation
 *
 * This script demonstrates:
 * 1. AES-256-GCM encryption/decryption round-trip
 * 2. Vault RPC key retrieval (if configured)
 * 3. Environment fallback key loading
 *
 * Usage:
 * - Set ENCRYPTION_KEY_SOURCE=vault and ENCRYPTION_VAULT_RPC=get_encryption_key for Vault mode
 * - Or set ENCRYPTION_KEY with base64/hex key for env mode
 * - Run: node test-encryption-roundtrip.js
 */

const { encrypt, decrypt, loadEncryptionKey } = require('./services/encryptionService');

async function testEncryptionRoundTrip() {
  console.log('🔐 Testing AES-256-GCM Encryption Round-Trip...\n');

  const testData = {
    string: 'Hello, World!',
    object: { user: 'test@example.com', id: 123 },
    sensitive: 'Sensitive contact number: +1-555-0123'
  };

  for (const [key, data] of Object.entries(testData)) {
    try {
      console.log(`Testing ${key}:`, data);

      // Encrypt
      const encrypted = await encrypt(data);
      console.log('  ✅ Encrypted successfully');
      console.log('    Algorithm:', encrypted.algorithm);
      console.log('    Key Version:', encrypted.keyVersion);

      // Decrypt
      const decrypted = await decrypt(encrypted.encrypted, encrypted.iv, encrypted.authTag);
      console.log('  ✅ Decrypted successfully');

      // Verify round-trip
      const isEqual = JSON.stringify(data) === JSON.stringify(decrypted);
      if (isEqual) {
        console.log('  ✅ Round-trip verification PASSED\n');
      } else {
        console.log('  ❌ Round-trip verification FAILED');
        console.log('    Original:', data);
        console.log('    Decrypted:', decrypted);
        console.log('');
        return false;
      }
    } catch (error) {
      console.error(`  ❌ ${key} test FAILED:`, error.message);
      console.log('');
      return false;
    }
  }

  return true;
}

async function testKeyLoading() {
  console.log('🔑 Testing Key Loading...\n');

  try {
    const { key, version } = await loadEncryptionKey();
    console.log('  ✅ Key loaded successfully');
    console.log('    Key Length:', key.length, 'bytes (expected: 32)');
    console.log('    Key Version:', version);

    if (key.length !== 32) {
      console.log('  ❌ Invalid key length');
      return false;
    }

    console.log('  ✅ Key validation PASSED\n');
    return true;
  } catch (error) {
    console.error('  ❌ Key loading FAILED:', error.message);
    console.log('');
    return false;
  }
}

async function testVaultReachability() {
  console.log('🏦 Testing Vault Reachability...\n');

  const keySource = process.env.ENCRYPTION_KEY_SOURCE || 'env';
  console.log('  Key Source:', keySource);

  if (keySource !== 'vault') {
    console.log('  ⏭️  Skipping Vault test (using env fallback)\n');
    return true;
  }

  try {
    // Attempt to load key from Vault
    const { key, version } = await loadEncryptionKey();
    console.log('  ✅ Vault RPC reachable');
    console.log('    Key Version:', version);
    console.log('    Key Length:', key.length, 'bytes');

    // Test a quick encrypt/decrypt to ensure key works
    const testData = 'Vault key test';
    const encrypted = await encrypt(testData);
    const decrypted = await decrypt(encrypted.encrypted, encrypted.iv, encrypted.authTag);

    if (decrypted === testData) {
      console.log('  ✅ Vault key functional\n');
      return true;
    } else {
      console.log('  ❌ Vault key test FAILED\n');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Vault reachability FAILED:', error.message);
    console.log('  💡 Ensure Vault RPC is configured and accessible\n');
    return false;
  }
}

async function main() {
  console.log('🚀 NutriHelp Encryption Service Validation\n');
  console.log('Environment:');
  console.log('  ENCRYPTION_KEY_SOURCE:', process.env.ENCRYPTION_KEY_SOURCE || 'env (default)');
  console.log('  ENCRYPTION_VAULT_RPC:', process.env.ENCRYPTION_VAULT_RPC || '(not set)');
  console.log('  ENCRYPTION_KEY_ENV_NAME:', process.env.ENCRYPTION_KEY_ENV_NAME || 'ENCRYPTION_KEY');
  console.log('  ENCRYPTION_KEY_VERSION:', process.env.ENCRYPTION_KEY_VERSION || 'v1');
  console.log('');

  let allPassed = true;

  // Test key loading
  allPassed &= await testKeyLoading();

  // Test Vault reachability
  allPassed &= await testVaultReachability();

  // Test encryption round-trip
  allPassed &= await testEncryptionRoundTrip();

  console.log('='.repeat(50));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - Encryption service is ready!');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED - Check configuration and try again.');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testEncryptionRoundTrip, testKeyLoading, testVaultReachability };