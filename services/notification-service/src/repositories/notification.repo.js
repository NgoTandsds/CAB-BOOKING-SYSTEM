const Notification = require('../models/notification.model');

exports.create = (data) => Notification.create(data);
exports.findByUser = (userId) => Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
exports.markRead = (id) => Notification.findByIdAndUpdate(id, { read: true }, { new: true });
exports.markAllRead = (userId) => Notification.updateMany({ userId, read: false }, { read: true });
