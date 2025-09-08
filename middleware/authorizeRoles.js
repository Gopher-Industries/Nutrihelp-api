/**
 * Role-based access control (RBAC) middleware
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    // Supabase JWTs: "role" is usually "authenticated" or "service_role"
    // Custom JWTs: you explicitly set "role" in payload
    const userRole = req.user?.role || req.user?.user_roles || null;

    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: "Role missing in token",
        code: "ROLE_MISSING"
      });
    }

    // Normalize role value (lowercase string)
    const roleValue = String(userRole).toLowerCase();

    // Normalize allowed roles too
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(roleValue)) {
      return res.status(403).json({
        success: false,
        error: "Access denied: insufficient role",
        code: "ACCESS_DENIED"
      });
    }

    next();
  };
}

module.exports = authorizeRoles;