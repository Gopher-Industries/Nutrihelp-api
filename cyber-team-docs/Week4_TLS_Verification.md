# Week 4 TLS Verification

This document records the local verification steps and evidence checklist for the TLS hardening work applied to the main backend runtime.

## Scope Verified

- TLS 1.3 is enforced on the root backend runtime via `server.js`
- HSTS header is enabled with `max-age`, `includeSubDomains`, and `preload`
- HTTP traffic is redirected to HTTPS

## Local Setup

Generate a local self-signed certificate before starting the backend:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/local-key.pem \
  -out certs/local-cert.pem \
  -days 365 \
  -subj "/CN=localhost"
```

Start the backend:

```bash
npm start
```

Expected startup output:

```text
HTTPS server running on port 443 (TLS 1.3 only)
HTTP redirect server running on port 80
```

## Verification Commands

### 1. TLS 1.3 succeeds

```bash
openssl s_client -connect localhost:443 -tls1_3
```

Expected result:

- handshake succeeds
- negotiated protocol is `TLSv1.3`

### 2. TLS 1.2 is blocked

```bash
openssl s_client -connect localhost:443 -tls1_2
```

Expected result:

- handshake fails
- no TLS 1.2 session is established

### 3. HSTS header is present

```bash
curl -k -I https://localhost:443/api/health
```

Expected header:

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 4. HTTP redirects to HTTPS

```bash
curl -I http://localhost:80/api/health
```

Expected result:

```text
HTTP/1.1 301 Moved Permanently
Location: https://localhost:443/api/health
```

### 5. Health endpoint returns secure runtime status

```bash
curl -k https://localhost:443/api/health
```

Expected result:

```json
{"status":"ok","tls":"1.3 enforced"}
```

## PR Evidence Checklist

- OpenSSL TLS 1.3 success output attached
- OpenSSL TLS 1.2 blocked output attached
- HSTS header response attached
- Browser DevTools screenshots attached for:
  - desktop
  - mobile
  - tablet
