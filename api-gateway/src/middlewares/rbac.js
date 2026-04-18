/**
 * Role-Based Access Control middleware
 * Usage: rbac('ADMIN') or rbac(['ADMIN', 'DRIVER'])
 */
module.exports = function rbac(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (!userRole || !allowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowed.join(', ')}`,
      });
    }
    next();
  };
};
