
# NutriHelp – Week 9 Code Change Documentation
**Author:** Himanshi – Junior SOC Analyst, Cybersecurity Team  
**Sprint:** 2 (Week 9)  
**Purpose:** Enhance backend logging and SOC visibility

---

## Overview
This document provides a summary of all code-level changes suggested in Week 9 to improve the NutriHelp backend's security observability and audit readiness.  
All changes aim to make authentication, token management, and access control events **persistently logged** in Supabase, replacing temporary console-only logging.

---

## 1. Files Modified
| File Name | Purpose of Modification |
|------------|--------------------------|
| `authService.js` | Added persistent Supabase logs for token creation, verification, refresh, and logout |
| `authorizeRoles.js` | Added logging for unauthorized access attempts |
| `authenticateToken.js` | Confirmed token validation errors routed to central logger |
| `errorLogService.js` | Reviewed for completeness, no structural changes needed |
| `server.js` | Added system startup logging (optional) |

---

## 2. Suggested Code Changes Summary

### 2.1 `authService.js`

**Before:**
```js
line 158: console.log("Generated accessToken:", accessToken);
```

**After:**
```js
await supabase.from('token_activity_logs').insert({
  user_id: user.user_id,
  event_type: 'token_generated',
  token_type: 'access',
  ip_address: deviceInfo.ip || null,
  user_agent: deviceInfo.userAgent || null,
  created_at: new Date().toISOString()
});
```

**Purpose:**  
Replaced console-only token logging with persistent Supabase entries to maintain an audit trail of token creation events.

---

**Before:**
```js
158 console.error("Token verification failed:", error.message);
```

**After:**
```js
await supabase.from('token_activity_logs').insert({
  event_type: 'token_verification_failed',
  token_type: 'access',
  error_message: error.message,
  created_at: new Date().toISOString()
});
```

**Purpose:**  
Ensures all token validation failures are recorded for forensic tracking and anomaly detection.

---

### 2.2 `authorizeRoles.js`

**Before:**
```js
return res.status(403).json({ message: 'Access denied' });
```

**After:**
```js
await supabase.from('rbac_violation_logs').insert({
  user_id: req.user.userId,
  attempted_role: req.user.role,
  endpoint: req.originalUrl,
  ip_address: req.ip,
  created_at: new Date().toISOString()
});
return res.status(403).json({ message: 'Access denied' });
```

**Purpose:**  
Adds persistent log entries for unauthorized role access attempts.

---

### 2.3 `authService.js` (Logout and Session Management)

**New Code suggested:**
```js
await supabase.from('session_logs').insert({
  user_id: userId,
  event: 'logout',
  timestamp: new Date().toISOString()
});
```

**Purpose:**  
Logs logout events for session tracking and anomaly detection.

---

### 2.4 `server.js` (Optional)

**New Code suggested:**
```js
await supabase.from('system_logs').insert({
  event: 'server_start',
  port: PORT,
  timestamp: new Date().toISOString()
});
```

**Purpose:**  
Provides a record of server restarts for audit traceability and monitoring consistency.

---

## 3. New Supabase Tables Introduced

| Table | Purpose | Key Fields |
|--------|----------|------------|
| `token_activity_logs` | Track token generation, refresh, and verification events | user_id, event_type, token_type, timestamp |
| `session_logs` | Track user session activities like logout and cleanup | user_id, event, timestamp |
| `rbac_violation_logs` | Record unauthorized role access attempts | user_id, attempted_role, endpoint, timestamp |
| `system_logs` | Record backend startup or system events | event, port, timestamp |

---

## 4. Impact and Benefits

| Area | Impact |
|-------|---------|
| SOC Visibility | Enables persistent visibility for token and access activities |
| Forensic Analysis | Provides traceable logs for incident investigations |
| Compliance | Aligns with ISO 27001 and SOC 2 audit standards |
| Monitoring | Prepares foundation for future SIEM integration |

---

## 5. Next Steps
1. Review changes with the team lead for integration approval.  
2. Deploy modified backend on test branch ("Logging_in_NutriHelp").  
3. Create retention and archival policy scripts (Week 9-10).  

---

**Document Version:** 1.0  
**Date:** Week 9, Trimester 2 2026  
**Author:** Himanshi (Junior SOC Analyst, Cybersecurity Team)
