# Week 2 Research Notes — Encryption at Rest + TLS 1.3 (Nutri-Help)

## Supabase Column-Level Encryption: pgcrypto vs Vault vs client-side

- **`pgcrypto` (SQL-level column encryption)**
  - Best when you must encrypt specific DB columns while still handling encryption inside Postgres.
  - Typical pattern uses `pgp_sym_encrypt()` / `pgp_sym_decrypt()`.
  - **Pros**
    - Keeps encryption logic close to data layer.
    - Can be integrated into SQL functions/triggers.
    - Good for selective protection of high-risk fields (medical notes, symptoms, free text).
  - **Cons**
    - Key management is the hard part (you still must store/retrieve key securely).
    - Limited indexing/searching over ciphertext.
    - Easy to misuse (accidental decrypt in broad queries, key exposure in SQL logs).

- **Supabase Vault (secret management, not a bulk data-encryption engine)**
  - Vault stores **secrets encrypted at rest** and exposes them via controlled SQL access.
  - Best used for **key/secret storage**, not as the primary table for app health data.
  - **Pros**
    - Managed secret storage in Supabase.
    - Encryption key handled outside your database data path.
    - Good fit for storing encryption keys/API secrets for DB functions.
  - **Cons**
    - If DB role can read decrypted secrets, blast radius is still large.
    - Adds operational/permission complexity.
    - Not a direct replacement for application-layer envelope encryption.

- **Client-side / backend-side encryption (recommended for strongest isolation)**
  - Encrypt in Node.js before insert; decrypt only in backend service layer.
  - Frontend and direct SQL clients never see plaintext keys.
  - **Pros**
    - Strongest boundary control (decrypt only in trusted backend).
    - Easier to enforce least privilege with Supabase RLS + API layer.
    - Cleaner key rotation with key IDs (`kid`) per row.
  - **Cons**
    - More application code.
    - Harder querying/filtering on encrypted fields.
    - Requires careful key lifecycle and versioning.

---

## Node.js crypto best practices for AES-256

- Prefer **AEAD mode**: `aes-256-gcm` (confidentiality + integrity).
- Use **32-byte key** for AES-256.
- Use a **new random IV/nonce per encryption** (12 bytes for GCM is standard).
- Store `{kid, iv, ciphertext, tag}` per encrypted value.
- Keep keys as binary (`Buffer` / `KeyObject`), avoid string-based key handling where possible.
- Use authenticated decryption (`setAuthTag` + `final`) and fail closed on tag mismatch.
- Never log plaintext, keys, IV, or tags in production logs.

### Node.js AES-256-GCM example (backend only)

```js
const crypto = require('node:crypto');

function encryptField(plaintext, key, kid) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    kid,
    iv: iv.toString('base64'),
    ct: ciphertext.toString('base64'),
    tag: tag.toString('base64'),
  };
}

function decryptField(payload, key) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64'),
    { authTagLength: 16 }
  );

  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ct, 'base64')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}
```

### Key generation example

```js
const crypto = require('node:crypto');
const key = crypto.randomBytes(32); // 256-bit AES key
console.log(key.toString('base64'));
```

---

## Option A vs Option B (Key storage)

### Option A: Supabase Vault

- **When to use**
  - You need DB-side secret access (SQL functions/triggers/webhooks) and centralized secret governance in Supabase.
- **Pros**
  - Managed secret storage and encryption-at-rest behavior for secrets.
  - Good if encryption/decryption logic runs in Postgres functions.
  - Centralized access control per DB role.
- **Cons**
  - App/backend compromise + privileged DB role can still expose decrypted secrets.
  - More complex SQL privilege design and auditing required.
  - Not ideal as the only control for high-volume app data encryption.

### Option B: `.env` + GitHub Secrets

- **When to use**
  - Backend-only encryption/decryption in Node.js service.
- **Pros**
  - Simple CI/CD integration.
  - Keys never stored in source control when done correctly.
  - Easy to inject per-environment keys.
- **Cons**
  - Risk of accidental `.env` leakage on host/runtime.
  - Rotation discipline depends on deployment hygiene.
  - Secret sprawl across pipelines/runners if not controlled.

### Practical recommendation

- **Recommended architecture: hybrid**
  - Store long-lived master secrets in a managed secret store (Vault-style).
  - Backend retrieves secrets securely at startup (or via short-lived secret fetch).
  - Perform encrypt/decrypt **only in backend Node.js**.
  - Do not decrypt in frontend; do not expose decrypted SQL views to public roles.

---

## Key rotation strategy (recommended)

- Use **versioned keys** (`kid`) and envelope-style metadata per encrypted field/row.
- Keep at least:
  - `active_kid` for new writes.
  - `decrypt_only_kids` for reading old records.
- Rotation flow:
  1. Generate new AES-256 key (`kid=vN+1`).
  2. Deploy backend with dual-read support (`vN` + `vN+1`), write with `vN+1`.
  3. Background re-encrypt old rows from `vN` to `vN+1` in batches.
  4. Remove `vN` from decrypt set after verification window.
- Add operational controls:
  - Audit key access and decrypt operations.
  - Run rotation at fixed interval (e.g., 90 days) or immediately after incident.
  - Keep rollback window with strict expiry.

### Minimal schema pattern

```sql
-- Example encrypted field metadata columns
encrypted_payload jsonb not null,   -- { kid, iv, ct, tag }
encryption_kid text not null
```

---

## Enforce decryption only in backend

- Frontend sends/receives business payloads via API; never receives raw key material.
- Supabase client in frontend must not hold decrypt capability.
- Use backend service role for controlled DB operations.
- Restrict sensitive columns in RLS policies and API responses.
- If using DB functions, expose only sanitized outputs and avoid generic decrypt RPC endpoints.

---

## TLS 1.3 guidance (Node.js/Express + Supabase)

- Supabase connections are TLS in transit by default.
- Ensure your public API endpoint is served behind TLS 1.3 (reverse proxy/LB preferred).
- Force HTTPS and HSTS at edge.
- If terminating TLS in Node directly, set minimum TLS version:

```js
const https = require('https');
const fs = require('fs');
const app = require('./app');

https.createServer(
  {
    key: fs.readFileSync(process.env.TLS_KEY_PATH),
    cert: fs.readFileSync(process.env.TLS_CERT_PATH),
    minVersion: 'TLSv1.3',
  },
  app
).listen(443);
```

---

## Performance impact on AI meal-plan endpoints

- **Expected impact**: usually **low-to-moderate** relative to AI inference/network latency.
- AES-256-GCM per field is fast; the bigger cost is often:
  - serialization/deserialization,
  - extra DB round-trips,
  - inability to index/filter encrypted columns.
- Main risks for AI endpoints:
  - decrypting too many rows before prompt construction,
  - synchronous crypto in request hot paths,
  - large payload re-encryption during peak traffic.
- Mitigations:
  - encrypt only sensitive columns (not whole rows blindly),
  - cache decrypted derived profile features briefly in backend memory (short TTL),
  - batch/background re-encryption jobs,
  - benchmark p95 latency before/after enabling encryption.

---

## Final recommendation for Nutri-Help

- Use **backend-side AES-256-GCM** for sensitive health/profile fields.
- Use **Supabase Vault for secret/key management support**, not as your only encryption control.
- Implement **key versioning + staged rotation**.
- Keep **decryption strictly in backend**.
- Enforce **TLS 1.3** at API edge and verify secure transport end-to-end.