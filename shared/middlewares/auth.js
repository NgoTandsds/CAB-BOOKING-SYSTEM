/**
 * Shared JWT verify middleware — for internal service routes
 * Trusts x-user-id/x-user-role headers set by API Gateway
 */
module.exports = function requireUser(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  next();
};
