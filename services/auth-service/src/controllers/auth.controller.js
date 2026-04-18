const authService = require('../services/auth.service');
const userRepo = require('../repositories/user.repo');

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.refresh = async (req, res) => {
  try {
    const result = await authService.refreshToken(req.body.refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    await authService.logout(userId, token);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.verify = async (req, res) => {
  try {
    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    const decoded = await authService.verifyToken(token);
    res.status(200).json({ success: true, data: decoded });
  } catch (e) { res.status(e.status || 401).json({ success: false, message: e.message }); }
};

exports.me = async (req, res) => {
  try {
    const user = await userRepo.findById(req.headers['x-user-id']);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: { id: user.id, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
