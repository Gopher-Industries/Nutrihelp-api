/**
 * Role-based access control (RBAC) middleware with violation logging
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // ✅ still using anon key
);

function authorizeRoles(...allowedRoles) {
  return async (req, res, next) => {
    const userRole = req.user?.role || req.user?.user_roles || null;

    if (!userRole) {
      await logViolation(req, userRole, "ROLE_MISSING");
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
    user_id: req.user?.userId || "unknown",
    email: req.user?.email || "unknown",    // ✅ added email
    role: role || "unknown",
    endpoint: req.originalUrl,
    method: req.method,
    status
  };

  try {
    const { error } = await supabase.from("rbac_violation_logs").insert([payload]);
    if (error) {
      console.error("❌ Supabase insert error:", error.message);
    } else {
      console.log("✅ RBAC violation logged:", payload);
    }
  } catch (err) {
    console.error("❌ RBAC log exception:", err.message);
  }
}

module.exports = authorizeRoles;

