const UserProfile = require('../models/user.model');

exports.findByAuthId = (authId) => UserProfile.findOne({ where: { authId } });
exports.findById = (id) => UserProfile.findByPk(id);
exports.upsert = (authId, data) => UserProfile.upsert({ ...data, authId }, { returning: true });
exports.findAll = () => UserProfile.findAll({ order: [['createdAt', 'DESC']] });
