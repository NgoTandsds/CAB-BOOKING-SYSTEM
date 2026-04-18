const notificationRepo = require('../repositories/notification.repo');

exports.getNotifications = async (req, res) => {
  try {
    const data = await notificationRepo.findByUser(req.headers['x-user-id']);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.markRead = async (req, res) => {
  try {
    const data = await notificationRepo.markRead(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await notificationRepo.markAllRead(req.headers['x-user-id']);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
