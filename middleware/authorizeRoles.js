function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(403).json({ message: "Role missing in token" });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied: insufficient role" });
    }

    next();
  };
}

module.exports = authorizeRoles; // ✅ make sure this line is present