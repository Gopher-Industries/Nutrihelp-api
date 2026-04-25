# Week 4 TLS Verification

## Purpose

This document captures the local verification commands for the Week 4 TLS hardening task.

## Verification Steps

### 1. Start the backend

Ensure the root server is running from the repository root:

```bash
node server.js
```

### 2. Test TLS 1.3 connection

```bash
openssl s_client -connect localhost:443 -tls1_3
```

Expected: connection established and TLS 1.3 handshake succeeds.

### 3. Test TLS 1.2 rejection

```bash
openssl s_client -connect localhost:443 -tls1_2
```

Expected: handshake fails or connection is rejected.

### 4. Check HSTS header

```bash
curl -I https://localhost:443/api/health | grep -i strict-transport-security
```

Expected: HSTS header is present with max-age, includeSubDomains, and preload directives.

### 5. Test HTTP-to-HTTPS redirect

```bash
curl -I http://localhost:80/api/health
```

Expected: `301` redirect to `https://localhost:443/api/health`.

### 6. Verify health endpoint

```bash
curl -k https://localhost:443/api/health
```

Expected: JSON response with `status: ok` and `tls: 1.3 enforced`.
