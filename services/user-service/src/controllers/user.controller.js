const userService = require('../services/user.service');

exports.getProfile = async (req, res) => {
  try {
    const data = await userService.getProfile(req.headers['x-user-id']);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const data = await userService.updateProfile(req.headers['x-user-id'], req.body);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getUserById = async (req, res) => {
  try {
    const data = await userService.getUserById(req.params.id);
    res.json({ success: true, data });
  } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
};

exports.getAllUsers = async (req, res) => {
  try {
    const data = await userService.getAllUsers();
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
