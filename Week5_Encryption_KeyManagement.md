# Week 5 AES-256 Encryption Foundation & Key Management

## Overview

This implements the secure AES-256-GCM encryption service with Supabase Vault key management for encrypting sensitive health data at rest.

## Components

- **encryptionService.js**: AES-256-GCM encryption with IV + auth tag
- **Supabase Vault Integration**: Secure key storage and RPC retrieval
- **Backend-only Functions**: `encrypt()` and `decrypt()` functions

## Vault Setup

### 1. Generate AES-256 Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Store in Supabase Vault
```sql
select vault.create_secret(
   '<BASE64_KEY_FROM_STEP_1>',
   'nutrihelp-aes-key',
   'AES-256-GCM key for NutriHelp backend encryption'
);
```

### 3. Create Key Retrieval RPC
```sql
create or replace function get_encryption_key()
returns text
language plpgsql
security definer
set search_path = vault, public
as $$
declare
   key_value text;
begin
   select decrypted_secret
   into key_value
   from vault.decrypted_secrets
   where name = 'nutrihelp-aes-key'
   limit 1;

   return key_value;
end;
$$;
```

### 4. Secure RPC Permissions
```sql
revoke execute on function get_encryption_key() from public, anon, authenticated;
grant execute on function get_encryption_key() to service_role;
```

## Environment Configuration

Add to `.env`:
```env
ENCRYPTION_KEY_SOURCE=vault
ENCRYPTION_VAULT_RPC=get_encryption_key
ENCRYPTION_KEY_VERSION=v1
```

## Usage

```javascript
const { encrypt, decrypt } = require('./services/encryptionService');

// Encrypt data
const result = await encrypt({ userId: 123, sensitive: 'data' });
// Returns: { encrypted, iv, authTag, keyVersion, algorithm }

// Decrypt data
const original = await decrypt(result.encrypted, result.iv, result.authTag);
```

## Verification Commands

**Round-trip Test:**
```bash
node -e "require('dotenv').config(); const { encrypt, decrypt } = require('./services/encryptionService'); (async () => { const original = 'Hello NutriHelp'; const enc = await encrypt(original); const dec = await decrypt(enc.encrypted, enc.iv, enc.authTag); console.log(dec === original ? 'PASS' : 'FAIL'); })();"
```

**Vault RPC Test:**
```bash
node -e "require('dotenv').config(); const supabase = require('./database/supabaseClient'); (async () => { const { data, error } = await supabase.rpc('get_encryption_key'); console.log('RPC OK:', !error && Boolean(data)); })();"
```

## Security Notes

- Key never stored in source code or environment variables
- Vault access restricted to `service_role` only
- Decryption is backend-only
- Supports future key rotation with version tracking