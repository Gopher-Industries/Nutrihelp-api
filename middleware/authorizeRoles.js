/**
 * Role-based access control (RBAC) middleware with violation logging
 */
const { supabaseService } = require('../services/supabaseClient');
const logger = require('../utils/logger');
const {
  getClientIp,
  registerRbacViolation,
} = require('../services/securityEvents/securityResponseService');

function authorizeRoles(...allowedRoles) {
  return async (req, res, next) => {
    const userRole = req.user?.role || req.user?.user_roles || null;

    if (!userRole) {
      await logViolation(req, userRole, "ROLE_MISSING");
      await registerRbacViolation(req, {
        status: 'ROLE_MISSING',
        allowedRoles,
      });
      return res.status(403).json({
        success: false,
        error: "Role missing in token",
        code: "ROLE_MISSING"
      });
    }

    const roleValue = String(userRole).toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(roleValue)) {
      await logViolation(req, roleValue, "ACCESS_DENIED");
      await registerRbacViolation(req, {
        status: 'ACCESS_DENIED',
        allowedRoles: normalizedAllowed,
      });
      return res.status(403).json({
        success: false,
        error: "Access denied: insufficient role",
        code: "ACCESS_DENIED"
      });
    }

    // ✅ If role is allowed, continue
    next();
  };
}
 //feature/rbac-extension
async function logViolation(req, role, status) {
  const payload = {
    request_id: req.requestId,
    user_id: req.user?.userId || "unknown",
    email: req.user?.email || "unknown",
    role: role || "unknown",
    endpoint: req.originalUrl,
    method: req.method,
    status,
    ip_address: getClientIp(req),
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabaseService.from("rbac_violation_logs").insert([payload]);
    if (error) {
      logger.warn("Failed to persist RBAC violation log", {
        message: error.message,
        endpoint: payload.endpoint,
        role: payload.role,
      });
    } else {
      logger.warn("RBAC violation logged", payload);
    }
  } catch (err) {
    logger.logError("RBAC log exception", err, {
      endpoint: payload.endpoint,
      role: payload.role,
    });
  }
}

module.exports = authorizeRoles;
